import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useTemplates, useTemplateWithDetails, useTemplateStats, Template } from '@/hooks/useTemplates';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TemplatesPage() {
  const { t, language } = useLanguage();
  const { data: templates, isLoading } = useTemplates();
  const { data: templateStats } = useTemplateStats();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { data: selectedTemplate, isLoading: detailsLoading } = useTemplateWithDetails(selectedTemplateId || '');

  const getStats = (templateId: string) => {
    const stat = templateStats?.find(s => s.id === templateId);
    return {
      categoryCount: stat?.categoryCount || 0,
      criteriaCount: stat?.criteriaCount || 0,
    };
  };

  const getCriticalCount = (template: Template) =>
    template.categories?.reduce((sum, cat) => 
      sum + cat.criteria.filter(c => c.isCritical).length, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('templates.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('templates.subtitle')}</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t('templates.create')}
        </Button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {templates.map((template) => {
            const stats = getStats(template.id);
            return (
              <motion.div
                key={template.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedTemplateId(template.id)}
                className="bg-card rounded-xl border border-border p-6 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  {template.isActive && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-score-excellent/10 text-score-excellent rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'ar' ? 'نشط' : 'Active'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {language === 'ar' ? template.nameAr || template.name : template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ar' ? 'الإصدار' : 'Version'} {template.version}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.categoryCount}</p>
                    <p className="text-xs text-muted-foreground">{t('templates.categories')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.criteriaCount}</p>
                    <p className="text-xs text-muted-foreground">{t('templates.criteria')}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            {language === 'ar' ? 'لا توجد قوالب' : 'No templates yet'}
          </h3>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'أنشئ قالب التقييم الأول' : 'Create your first evaluation template'}
          </p>
          <Button className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            {t('templates.create')}
          </Button>
        </div>
      )}

      {/* Template Detail Sheet */}
      <Sheet open={!!selectedTemplateId} onOpenChange={(open) => !open && setSelectedTemplateId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailsLoading ? (
            <div className="space-y-4 pt-8">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2 mt-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </div>
          ) : selectedTemplate ? (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl">
                      {language === 'ar' ? selectedTemplate.nameAr || selectedTemplate.name : selectedTemplate.name}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'الإصدار' : 'Version'} {selectedTemplate.version} • {selectedTemplate.categories.length} {t('templates.categories')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {selectedTemplate.isActive && (
                    <Badge variant="outline" className="bg-score-excellent/10 text-score-excellent border-score-excellent/30">
                      <CheckCircle2 className="w-3 h-3 me-1" />
                      {language === 'ar' ? 'قالب نشط' : 'Active Template'}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-score-critical/10 text-score-critical border-score-critical/30">
                    <AlertTriangle className="w-3 h-3 me-1" />
                    {getCriticalCount(selectedTemplate)} {language === 'ar' ? 'معايير حرجة' : 'Critical Criteria'}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="py-4">
                <h3 className="font-semibold text-foreground mb-3">
                  {language === 'ar' ? 'الفئات والمعايير' : 'Categories & Criteria'}
                </h3>
                {selectedTemplate.categories.length > 0 ? (
                  <Accordion type="multiple" className="space-y-2">
                    {selectedTemplate.categories.map((category) => (
                      <AccordionItem
                        key={category.id}
                        value={category.id}
                        className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/30"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center justify-between w-full pe-2">
                            <span className="font-medium text-foreground">
                              {language === 'ar' ? category.nameAr || category.name : category.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {category.criteria.length} {t('templates.criteria')}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {category.weight}%
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pb-3">
                            {category.criteria.map((criterion) => (
                              <div
                                key={criterion.id}
                                className="flex items-start justify-between p-3 bg-background rounded-lg border border-border/50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-foreground">
                                      {language === 'ar' ? criterion.nameAr || criterion.name : criterion.name}
                                    </span>
                                    {criterion.isCritical && (
                                      <Badge variant="destructive" className="text-xs px-1 py-0">
                                        <AlertTriangle className="w-3 h-3" />
                                      </Badge>
                                    )}
                                  </div>
                                  {criterion.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{criterion.description}</p>
                                  )}
                                </div>
                                <div className="text-end">
                                  <p className="text-sm font-medium text-foreground">{criterion.maxScore} pts</p>
                                  <p className="text-xs text-muted-foreground">{criterion.weight}x</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {language === 'ar' ? 'لا توجد فئات' : 'No categories defined'}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
