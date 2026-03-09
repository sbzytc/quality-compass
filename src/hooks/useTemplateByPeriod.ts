import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EvaluationTemplateData, TemplateCategory } from './useTemplateData';

export function useTemplateByPeriod(periodType: 'weekly' | 'monthly' | 'yearly') {
  return useQuery({
    queryKey: ['template-by-period', periodType],
    queryFn: async (): Promise<EvaluationTemplateData | null> => {
      const { data: template, error: templateError } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .eq('period_type', periodType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateError) throw templateError;
      if (!template) return null;

      const { data: categories, error: catError } = await supabase
        .from('template_categories')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order');

      if (catError) throw catError;

      const categoryIds = categories?.map(c => c.id) || [];
      const { data: criteria, error: critError } = await supabase
        .from('template_criteria')
        .select('*')
        .in('category_id', categoryIds)
        .order('sort_order');

      if (critError) throw critError;

      const categoriesWithCriteria: TemplateCategory[] = (categories || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        nameAr: cat.name_ar,
        weight: Number(cat.weight),
        sortOrder: cat.sort_order,
        criteria: (criteria || [])
          .filter(c => c.category_id === cat.id)
          .map(c => ({
            id: c.id,
            name: c.name,
            nameAr: c.name_ar,
            description: c.description,
            maxScore: c.max_score,
            weight: Number(c.weight),
            isCritical: c.is_critical,
            sortOrder: c.sort_order,
          })),
      }));

      return {
        id: template.id,
        name: template.name,
        nameAr: template.name_ar,
        description: template.description,
        version: template.version,
        categories: categoriesWithCriteria,
      };
    },
  });
}
