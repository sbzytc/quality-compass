import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Save, Loader2, ArrowLeft, Layers, Repeat, Flag, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
type PriorityLevel = 'critical' | 'high' | 'medium';

const FREQUENCY_OPTIONS: { value: FrequencyType; en: string; ar: string }[] = [
  { value: 'daily', en: 'Daily', ar: 'يومي' },
  { value: 'weekly', en: 'Weekly', ar: 'أسبوعي' },
  { value: 'monthly', en: 'Monthly', ar: 'شهري' },
  { value: 'quarterly', en: 'Quarterly', ar: 'ربعي' },
  { value: 'semi_annual', en: 'Semi-annual', ar: 'نصف سنوي' },
  { value: 'yearly', en: 'Yearly', ar: 'سنوي' },
];

const PRIORITY_OPTIONS: { value: PriorityLevel; en: string; ar: string; color: string }[] = [
  { value: 'critical', en: 'Critical', ar: 'حرجة', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { value: 'high', en: 'High', ar: 'عالية', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'medium', en: 'Medium', ar: 'متوسطة', color: 'bg-blue-100 text-blue-700 border-blue-300' },
];

interface QuestionForm {
  localId: string;
  name: string;
  nameAr: string;
  description: string;
  maxScore: number;
  weight: number;
}

interface PriorityForm {
  localId: string;
  level: PriorityLevel;
  weight: number;
  questions: QuestionForm[];
}

interface FrequencyForm {
  localId: string;
  type: FrequencyType;
  priorities: PriorityForm[];
}

interface DomainForm {
  localId: string;
  name: string;
  nameAr: string;
  frequencies: FrequencyForm[];
}

const makeQuestion = (): QuestionForm => ({
  localId: crypto.randomUUID(),
  name: '',
  nameAr: '',
  description: '',
  maxScore: 5,
  weight: 100,
});

const makePriority = (level: PriorityLevel = 'medium'): PriorityForm => ({
  localId: crypto.randomUUID(),
  level,
  weight: 0,
  questions: [makeQuestion()],
});

const makeFrequency = (type: FrequencyType = 'monthly'): FrequencyForm => ({
  localId: crypto.randomUUID(),
  type,
  priorities: [makePriority('medium')],
});

const makeDomain = (): DomainForm => ({
  localId: crypto.randomUUID(),
  name: '',
  nameAr: '',
  frequencies: [makeFrequency()],
});

export default function CreateTemplatePage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/templates');
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isAr = language === 'ar';

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [domains, setDomains] = useState<DomainForm[]>([makeDomain()]);

  // ---------- mutations ----------
  const updateDomain = (id: string, patch: Partial<DomainForm>) =>
    setDomains(prev => prev.map(d => (d.localId === id ? { ...d, ...patch } : d)));
  const updateFreq = (dId: string, fId: string, patch: Partial<FrequencyForm>) =>
    setDomains(prev => prev.map(d => d.localId === dId
      ? { ...d, frequencies: d.frequencies.map(f => f.localId === fId ? { ...f, ...patch } : f) }
      : d));
  const updatePriority = (dId: string, fId: string, pId: string, patch: Partial<PriorityForm>) =>
    setDomains(prev => prev.map(d => d.localId === dId
      ? { ...d, frequencies: d.frequencies.map(f => f.localId === fId
          ? { ...f, priorities: f.priorities.map(p => p.localId === pId ? { ...p, ...patch } : p) }
          : f) }
      : d));
  const updateQuestion = (dId: string, fId: string, pId: string, qId: string, patch: Partial<QuestionForm>) =>
    setDomains(prev => prev.map(d => d.localId === dId
      ? { ...d, frequencies: d.frequencies.map(f => f.localId === fId
          ? { ...f, priorities: f.priorities.map(p => p.localId === pId
              ? { ...p, questions: p.questions.map(q => q.localId === qId ? { ...q, ...patch } : q) }
              : p) }
          : f) }
      : d));

  const addDomain = () => setDomains(prev => [...prev, makeDomain()]);
  const removeDomain = (id: string) => setDomains(prev => prev.filter(d => d.localId !== id));

  const addFreq = (dId: string) =>
    updateDomain(dId, { frequencies: [...domains.find(d => d.localId === dId)!.frequencies, makeFrequency()] });
  const removeFreq = (dId: string, fId: string) =>
    updateDomain(dId, { frequencies: domains.find(d => d.localId === dId)!.frequencies.filter(f => f.localId !== fId) });

  const addPriority = (dId: string, fId: string) => {
    const f = domains.find(d => d.localId === dId)!.frequencies.find(x => x.localId === fId)!;
    const used = new Set(f.priorities.map(p => p.level));
    const next = PRIORITY_OPTIONS.find(o => !used.has(o.value));
    if (!next) {
      toast.error(isAr ? 'تم إضافة جميع مستويات الأهمية' : 'All priority levels added');
      return;
    }
    updateFreq(dId, fId, { priorities: [...f.priorities, makePriority(next.value)] });
  };
  const removePriority = (dId: string, fId: string, pId: string) => {
    const f = domains.find(d => d.localId === dId)!.frequencies.find(x => x.localId === fId)!;
    updateFreq(dId, fId, { priorities: f.priorities.filter(p => p.localId !== pId) });
  };

  const addQuestion = (dId: string, fId: string, pId: string) => {
    const p = domains.find(d => d.localId === dId)!.frequencies.find(x => x.localId === fId)!.priorities.find(x => x.localId === pId)!;
    updatePriority(dId, fId, pId, { questions: [...p.questions, makeQuestion()] });
  };
  const removeQuestion = (dId: string, fId: string, pId: string, qId: string) => {
    const p = domains.find(d => d.localId === dId)!.frequencies.find(x => x.localId === fId)!.priorities.find(x => x.localId === pId)!;
    updatePriority(dId, fId, pId, { questions: p.questions.filter(q => q.localId !== qId) });
  };

  // ---------- summary ----------
  const totalQuestions = domains.reduce((s, d) =>
    s + d.frequencies.reduce((sf, f) => sf + f.priorities.reduce((sp, p) => sp + p.questions.length, 0), 0), 0);
  const criticalCount = domains.reduce((s, d) =>
    s + d.frequencies.reduce((sf, f) =>
      sf + f.priorities.filter(p => p.level === 'critical').reduce((sp, p) => sp + p.questions.length, 0), 0), 0);

  // ---------- save ----------
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(isAr ? 'يرجى إدخال اسم القالب' : 'Please enter a template name');
      return;
    }
    if (domains.length === 0) {
      toast.error(isAr ? 'أضف مجالاً واحداً على الأقل' : 'Add at least one domain');
      return;
    }
    for (const d of domains) {
      if (!d.name.trim()) { toast.error(isAr ? 'أدخل اسم لكل مجال' : 'Enter a name for each domain'); return; }
      if (d.frequencies.length === 0) { toast.error(isAr ? `أضف تكراراً للمجال "${d.name}"` : `Add frequency for "${d.name}"`); return; }
      for (const f of d.frequencies) {
        if (f.priorities.length === 0) { toast.error(isAr ? 'أضف أهمية لكل تكرار' : 'Add priority for each frequency'); return; }
        for (const p of f.priorities) {
          if (p.questions.length === 0) { toast.error(isAr ? 'أضف سؤالاً لكل أهمية' : 'Add a question for each priority'); return; }
          const wsum = p.questions.reduce((s, q) => s + q.weight, 0);
          if (Math.abs(wsum - 100) > 0.01) {
            toast.error(isAr
              ? `مجموع أوزان الأسئلة في "${d.name}" يجب أن يكون 100% (الحالي ${wsum}%)`
              : `Question weights in "${d.name}" must sum to 100% (current ${wsum}%)`);
            return;
          }
          for (const q of p.questions) {
            if (!q.name.trim()) { toast.error(isAr ? 'أدخل نص لكل سؤال' : 'Enter text for each question'); return; }
          }
        }
      }
    }

    setSaving(true);
    try {
      // 1) Template
      const { data: tpl, error: tplErr } = await supabase
        .from('evaluation_templates')
        .insert({
          name: name.trim(),
          name_ar: nameAr.trim() || null,
          description: description.trim() || null,
          version,
          period_type: 'yearly',
          is_active: true,
        })
        .select()
        .single();
      if (tplErr) throw tplErr;

      // 2) For each domain, create domain + legacy category mirror
      for (let dIdx = 0; dIdx < domains.length; dIdx++) {
        const d = domains[dIdx];

        const { data: dom, error: domErr } = await supabase
          .from('template_domains')
          .insert({
            template_id: tpl.id,
            name: d.name.trim(),
            name_ar: d.nameAr.trim() || null,
            sort_order: dIdx,
          })
          .select()
          .single();
        if (domErr) throw domErr;

        // Legacy category mirror (so EvaluationForm keeps working)
        const domainWeight = d.frequencies.reduce((s, f) => s + f.priorities.reduce((sp, p) => sp + p.weight, 0), 0);
        const { data: cat, error: catErr } = await supabase
          .from('template_categories')
          .insert({
            template_id: tpl.id,
            name: d.name.trim(),
            name_ar: d.nameAr.trim() || null,
            weight: domainWeight || 100,
            sort_order: dIdx,
          })
          .select()
          .single();
        if (catErr) throw catErr;

        // 3) frequencies
        for (let fIdx = 0; fIdx < d.frequencies.length; fIdx++) {
          const f = d.frequencies[fIdx];
          const { data: freq, error: freqErr } = await supabase
            .from('template_frequencies')
            .insert({ domain_id: dom.id, frequency_type: f.type, sort_order: fIdx })
            .select()
            .single();
          if (freqErr) throw freqErr;

          // 4) priorities
          for (let pIdx = 0; pIdx < f.priorities.length; pIdx++) {
            const p = f.priorities[pIdx];
            const { data: pri, error: priErr } = await supabase
              .from('template_priorities')
              .insert({
                frequency_id: freq.id,
                priority_level: p.level,
                weight: p.weight,
                sort_order: pIdx,
              })
              .select()
              .single();
            if (priErr) throw priErr;

            // 5) questions → criteria (with priority_id + legacy category_id)
            const rows = p.questions.map((q, qIdx) => ({
              category_id: cat.id,
              priority_id: pri.id,
              name: q.name.trim(),
              name_ar: q.nameAr.trim() || null,
              description: q.description.trim() || null,
              max_score: q.maxScore,
              weight: q.weight,
              is_critical: p.level === 'critical',
              sort_order: qIdx,
            }));
            const { error: critErr } = await supabase.from('template_criteria').insert(rows);
            if (critErr) throw critErr;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['templates'] });
      await queryClient.invalidateQueries({ queryKey: ['template-stats'] });
      toast.success(isAr ? 'تم إنشاء القالب بنجاح' : 'Template created successfully');
      navigate('/templates');
    } catch (err: any) {
      console.error('Template create error:', err);
      toast.error(err.message || (isAr ? 'حدث خطأ أثناء الحفظ' : 'Error saving template'));
    } finally {
      setSaving(false);
    }
  };

  const fLabel = (v: FrequencyType) => FREQUENCY_OPTIONS.find(o => o.value === v)![isAr ? 'ar' : 'en'];
  const pLabel = (v: PriorityLevel) => PRIORITY_OPTIONS.find(o => o.value === v)![isAr ? 'ar' : 'en'];
  const pColor = (v: PriorityLevel) => PRIORITY_OPTIONS.find(o => o.value === v)!.color;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={goBack} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isAr ? 'إنشاء قالب تقييم' : 'Create Evaluation Template'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAr ? 'المجال ← التكرار ← الأهمية ← الأسئلة' : 'Domain → Frequency → Priority → Questions'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isAr ? 'حفظ القالب' : 'Save Template'}
        </Button>
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{isAr ? 'معلومات القالب' : 'Template Info'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Restaurant Evaluation" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
              <Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: تقييم المطعم" dir="rtl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isAr ? 'الوصف' : 'Description'}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2 md:w-1/3">
            <Label>{isAr ? 'الإصدار' : 'Version'}</Label>
            <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0" />
          </div>
        </CardContent>
      </Card>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3 items-center">
        <Badge variant="outline" className="gap-1.5 py-1.5">
          <Layers className="w-3.5 h-3.5" />
          {domains.length} {isAr ? 'مجال' : 'Domains'}
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          {totalQuestions} {isAr ? 'سؤال' : 'Questions'}
        </Badge>
        {criticalCount > 0 && (
          <Badge variant="destructive" className="gap-1.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {criticalCount} {isAr ? 'حرج' : 'Critical'}
          </Badge>
        )}
      </div>

      {/* Domains */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            {isAr ? 'المجالات' : 'Domains'}
          </h2>
          <Button variant="outline" size="sm" onClick={addDomain} className="gap-1">
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة مجال' : 'Add Domain'}
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={domains.map(d => d.localId)} className="space-y-3">
          {domains.map((d, dIdx) => (
            <AccordionItem key={d.localId} value={d.localId} className="border border-border rounded-xl bg-card overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center justify-between w-full pe-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-medium">{d.name || d.nameAr || `${isAr ? 'مجال' : 'Domain'} ${dIdx + 1}`}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {d.frequencies.length} {isAr ? 'تكرار' : 'freq.'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {/* Domain fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">{isAr ? 'اسم المجال (EN)' : 'Domain (EN)'}</Label>
                    <Input value={d.name} onChange={e => updateDomain(d.localId, { name: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isAr ? 'اسم المجال (AR)' : 'Domain (AR)'}</Label>
                    <Input value={d.nameAr} onChange={e => updateDomain(d.localId, { nameAr: e.target.value })} dir="rtl" className="h-9" />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => removeDomain(d.localId)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Frequencies */}
                <div className="space-y-3 ps-2 border-s-2 border-primary/20">
                  {d.frequencies.map((f) => (
                    <Card key={f.localId} className="border-primary/20">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <Repeat className="w-4 h-4 text-primary" />
                            <Label className="text-xs">{isAr ? 'التكرار' : 'Frequency'}</Label>
                            <Select value={f.type} onValueChange={(v: FrequencyType) => updateFreq(d.localId, f.localId, { type: v })}>
                              <SelectTrigger className="h-8 w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FREQUENCY_OPTIONS.map(o => (
                                  <SelectItem key={o.value} value={o.value}>{isAr ? o.ar : o.en}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Badge variant="outline" className="text-xs">{fLabel(f.type)}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeFreq(d.localId, f.localId)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {/* Priorities */}
                        <div className="space-y-3 ps-2 border-s-2 border-amber-300/40">
                          {f.priorities.map(p => (
                            <div key={p.localId} className={`rounded-lg border p-3 space-y-3 ${pColor(p.level)}`}>
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Flag className="w-4 h-4" />
                                  <Label className="text-xs">{isAr ? 'الأهمية' : 'Priority'}</Label>
                                  <Select value={p.level} onValueChange={(v: PriorityLevel) => updatePriority(d.localId, f.localId, p.localId, { level: v })}>
                                    <SelectTrigger className="h-8 w-32 bg-white/60">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PRIORITY_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{isAr ? o.ar : o.en}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center gap-1">
                                    <Label className="text-xs">{isAr ? 'وزن' : 'Weight'} %</Label>
                                    <Input
                                      type="number"
                                      value={p.weight}
                                      onChange={e => updatePriority(d.localId, f.localId, p.localId, { weight: Number(e.target.value) })}
                                      className="h-8 w-20 bg-white/60"
                                      min={0}
                                    />
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePriority(d.localId, f.localId, p.localId)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>

                              {/* Questions */}
                              <div className="space-y-2">
                                {p.questions.map((q) => (
                                  <div key={q.localId} className="rounded-md border bg-white p-3 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <Input
                                        placeholder={isAr ? 'نص السؤال (EN)' : 'Question (EN)'}
                                        value={q.name}
                                        onChange={e => updateQuestion(d.localId, f.localId, p.localId, q.localId, { name: e.target.value })}
                                        className="h-9"
                                      />
                                      <Input
                                        placeholder={isAr ? 'نص السؤال (AR)' : 'Question (AR)'}
                                        value={q.nameAr}
                                        onChange={e => updateQuestion(d.localId, f.localId, p.localId, q.localId, { nameAr: e.target.value })}
                                        dir="rtl"
                                        className="h-9"
                                      />
                                    </div>
                                    <Input
                                      placeholder={isAr ? 'وصف (اختياري)' : 'Description (optional)'}
                                      value={q.description}
                                      onChange={e => updateQuestion(d.localId, f.localId, p.localId, q.localId, { description: e.target.value })}
                                      className="h-9"
                                    />
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <Label className="text-xs">{isAr ? 'أعلى درجة' : 'Max'}</Label>
                                        <Input
                                          type="number"
                                          value={q.maxScore}
                                          onChange={e => updateQuestion(d.localId, f.localId, p.localId, q.localId, { maxScore: Number(e.target.value) })}
                                          className="h-8 w-16"
                                          min={1}
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Label className="text-xs">{isAr ? 'وزن' : 'Weight'} %</Label>
                                        <Input
                                          type="number"
                                          value={q.weight}
                                          onChange={e => updateQuestion(d.localId, f.localId, p.localId, q.localId, { weight: Number(e.target.value) })}
                                          className="h-8 w-20"
                                          min={0}
                                          max={100}
                                        />
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ms-auto"
                                        onClick={() => removeQuestion(d.localId, f.localId, p.localId, q.localId)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full gap-1"
                                  onClick={() => addQuestion(d.localId, f.localId, p.localId)}>
                                  <Plus className="w-3.5 h-3.5" />
                                  {isAr ? 'إضافة سؤال' : 'Add Question'}
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="w-full gap-1"
                            onClick={() => addPriority(d.localId, f.localId)}>
                            <Plus className="w-3.5 h-3.5" />
                            {isAr ? 'إضافة مستوى أهمية' : 'Add Priority Level'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" size="sm" className="w-full gap-1"
                    onClick={() => addFreq(d.localId)}>
                    <Plus className="w-3.5 h-3.5" />
                    {isAr ? 'إضافة تكرار' : 'Add Frequency'}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Button variant="outline" className="w-full gap-2" onClick={addDomain}>
          <Plus className="w-4 h-4" />
          {isAr ? 'إضافة مجال جديد' : 'Add New Domain'}
        </Button>
      </div>
    </div>
  );
}