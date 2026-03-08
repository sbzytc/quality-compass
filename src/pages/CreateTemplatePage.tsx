import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CriterionForm {
  localId: string;
  name: string;
  nameAr: string;
  description: string;
  maxScore: number;
  weight: number;
  isCritical: boolean;
}

interface CategoryForm {
  localId: string;
  name: string;
  nameAr: string;
  weight: number;
  criteria: CriterionForm[];
}

const createCriterion = (): CriterionForm => ({
  localId: crypto.randomUUID(),
  name: '',
  nameAr: '',
  description: '',
  maxScore: 5,
  weight: 1,
  isCritical: false,
});

const createCategory = (): CategoryForm => ({
  localId: crypto.randomUUID(),
  name: '',
  nameAr: '',
  weight: 1,
  criteria: [createCriterion()],
});

export default function CreateTemplatePage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/templates');
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0');
  const [periodType, setPeriodType] = useState('yearly');
  const [categories, setCategories] = useState<CategoryForm[]>([createCategory()]);

  const addCategory = () => {
    setCategories(prev => [...prev, createCategory()]);
  };

  const removeCategory = (localId: string) => {
    setCategories(prev => prev.filter(c => c.localId !== localId));
  };

  const updateCategory = (localId: string, updates: Partial<CategoryForm>) => {
    setCategories(prev => prev.map(c => c.localId === localId ? { ...c, ...updates } : c));
  };

  const addCriterion = (categoryLocalId: string) => {
    setCategories(prev => prev.map(c =>
      c.localId === categoryLocalId
        ? { ...c, criteria: [...c.criteria, createCriterion()] }
        : c
    ));
  };

  const removeCriterion = (categoryLocalId: string, criterionLocalId: string) => {
    setCategories(prev => prev.map(c =>
      c.localId === categoryLocalId
        ? { ...c, criteria: c.criteria.filter(cr => cr.localId !== criterionLocalId) }
        : c
    ));
  };

  const updateCriterion = (categoryLocalId: string, criterionLocalId: string, updates: Partial<CriterionForm>) => {
    setCategories(prev => prev.map(c =>
      c.localId === categoryLocalId
        ? {
            ...c,
            criteria: c.criteria.map(cr =>
              cr.localId === criterionLocalId ? { ...cr, ...updates } : cr
            ),
          }
        : c
    ));
  };

  const totalCriteria = categories.reduce((sum, c) => sum + c.criteria.length, 0);
  const criticalCount = categories.reduce((sum, c) => sum + c.criteria.filter(cr => cr.isCritical).length, 0);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(language === 'ar' ? 'يرجى إدخال اسم القالب' : 'Please enter a template name');
      return;
    }

    if (categories.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إضافة فئة واحدة على الأقل' : 'Please add at least one category');
      return;
    }

    for (const cat of categories) {
      if (!cat.name.trim()) {
        toast.error(language === 'ar' ? 'يرجى إدخال اسم لكل فئة' : 'Please enter a name for each category');
        return;
      }
      if (cat.criteria.length === 0) {
        toast.error(language === 'ar' ? `الفئة "${cat.name}" يجب أن تحتوي على معيار واحد على الأقل` : `Category "${cat.name}" must have at least one criterion`);
        return;
      }
      for (const cr of cat.criteria) {
        if (!cr.name.trim()) {
          toast.error(language === 'ar' ? 'يرجى إدخال اسم لكل معيار' : 'Please enter a name for each criterion');
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('evaluation_templates')
        .insert({
          name: name.trim(),
          name_ar: nameAr.trim() || null,
          description: description.trim() || null,
          version,
          period_type: periodType,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create categories
      for (let catIdx = 0; catIdx < categories.length; catIdx++) {
        const cat = categories[catIdx];
        const { data: dbCategory, error: catError } = await supabase
          .from('template_categories')
          .insert({
            template_id: template.id,
            name: cat.name.trim(),
            name_ar: cat.nameAr.trim() || null,
            weight: cat.weight,
            sort_order: catIdx,
          })
          .select()
          .single();

        if (catError) throw catError;

        // Create criteria for this category
        const criteriaToInsert = cat.criteria.map((cr, crIdx) => ({
          category_id: dbCategory.id,
          name: cr.name.trim(),
          name_ar: cr.nameAr.trim() || null,
          description: cr.description.trim() || null,
          max_score: cr.maxScore,
          weight: cr.weight,
          is_critical: cr.isCritical,
          sort_order: crIdx,
        }));

        const { error: critError } = await supabase
          .from('template_criteria')
          .insert(criteriaToInsert);

        if (critError) throw critError;
      }

      await queryClient.invalidateQueries({ queryKey: ['templates'] });
      await queryClient.invalidateQueries({ queryKey: ['template-stats'] });

      toast.success(language === 'ar' ? 'تم إنشاء القالب بنجاح' : 'Template created successfully');
      navigate('/templates');
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء إنشاء القالب' : 'Error creating template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={goBack} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {language === 'ar' ? 'إنشاء قالب جديد' : 'Create New Template'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'حدد الفئات والمعايير لقالب التقييم' : 'Define categories and criteria for the evaluation template'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {language === 'ar' ? 'حفظ القالب' : 'Save Template'}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'معلومات القالب' : 'Template Info'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Restaurant Evaluation" />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
              <Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: تقييم المطعم" dir="rtl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={language === 'ar' ? 'وصف القالب...' : 'Template description...'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الإصدار' : 'Version'}</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0" />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الفترة' : 'Period Type'}</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">{language === 'ar' ? 'سنوي' : 'Yearly'}</SelectItem>
                  <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                  <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {categories.length} {language === 'ar' ? 'فئة' : 'Categories'}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {totalCriteria} {language === 'ar' ? 'معيار' : 'Criteria'}
        </Badge>
        {criticalCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1 gap-1">
            <AlertTriangle className="w-3 h-3" />
            {criticalCount} {language === 'ar' ? 'حرج' : 'Critical'}
          </Badge>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {language === 'ar' ? 'الفئات والمعايير' : 'Categories & Criteria'}
          </h2>
          <Button variant="outline" onClick={addCategory} className="gap-2">
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'إضافة فئة' : 'Add Category'}
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={categories.map(c => c.localId)} className="space-y-3">
          {categories.map((category, catIdx) => (
            <AccordionItem
              key={category.localId}
              value={category.localId}
              className="border border-border rounded-xl overflow-hidden bg-card"
            >
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center justify-between w-full pe-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {category.name || category.nameAr || `${language === 'ar' ? 'فئة' : 'Category'} ${catIdx + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {category.criteria.length} {language === 'ar' ? 'معيار' : 'criteria'}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Category fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs">{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label>
                      <Input
                        value={category.name}
                        onChange={e => updateCategory(category.localId, { name: e.target.value })}
                        placeholder="Category name"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{language === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
                      <Input
                        value={category.nameAr}
                        onChange={e => updateCategory(category.localId, { nameAr: e.target.value })}
                        placeholder="اسم الفئة"
                        dir="rtl"
                        className="h-9"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">{language === 'ar' ? 'الوزن %' : 'Weight %'}</Label>
                        <Input
                          type="number"
                          value={category.weight}
                          onChange={e => updateCategory(category.localId, { weight: Number(e.target.value) })}
                          min={0}
                          className="h-9"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-9 w-9"
                        onClick={() => removeCategory(category.localId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Criteria */}
                  <div className="space-y-2">
                    {category.criteria.map((criterion, crIdx) => (
                      <div
                        key={criterion.localId}
                        className="p-3 border border-border rounded-lg bg-background space-y-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{language === 'ar' ? 'المعيار (إنجليزي)' : 'Criterion (EN)'}</Label>
                            <Input
                              value={criterion.name}
                              onChange={e => updateCriterion(category.localId, criterion.localId, { name: e.target.value })}
                              placeholder="Criterion name"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{language === 'ar' ? 'المعيار (عربي)' : 'Criterion (AR)'}</Label>
                            <Input
                              value={criterion.nameAr}
                              onChange={e => updateCriterion(category.localId, criterion.localId, { nameAr: e.target.value })}
                              placeholder="اسم المعيار"
                              dir="rtl"
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{language === 'ar' ? 'الوصف' : 'Description'}</Label>
                          <Input
                            value={criterion.description}
                            onChange={e => updateCriterion(category.localId, criterion.localId, { description: e.target.value })}
                            placeholder={language === 'ar' ? 'وصف المعيار (اختياري)' : 'Criterion description (optional)'}
                            className="h-9"
                          />
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">{language === 'ar' ? 'أعلى درجة' : 'Max Score'}</Label>
                            <Input
                              type="number"
                              value={criterion.maxScore}
                              onChange={e => updateCriterion(category.localId, criterion.localId, { maxScore: Number(e.target.value) })}
                              min={1}
                              className="h-9 w-20"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">{language === 'ar' ? 'الوزن' : 'Weight'}</Label>
                            <Input
                              type="number"
                              value={criterion.weight}
                              onChange={e => updateCriterion(category.localId, criterion.localId, { weight: Number(e.target.value) })}
                              min={0}
                              step={0.1}
                              className="h-9 w-20"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={criterion.isCritical}
                              onCheckedChange={checked => updateCriterion(category.localId, criterion.localId, { isCritical: checked })}
                            />
                            <Label className="text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-destructive" />
                              {language === 'ar' ? 'حرج' : 'Critical'}
                            </Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-8 w-8 ms-auto"
                            onClick={() => removeCriterion(category.localId, criterion.localId)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCriterion(category.localId)}
                      className="gap-1 w-full"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'إضافة معيار' : 'Add Criterion'}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Button variant="outline" onClick={addCategory} className="gap-2 w-full">
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'إضافة فئة جديدة' : 'Add New Category'}
        </Button>
      </div>
    </div>
  );
}
