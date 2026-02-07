import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TemplateCriterion {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  maxScore: number;
  weight: number;
  isCritical: boolean;
  sortOrder: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  nameAr: string | null;
  weight: number;
  sortOrder: number;
  criteria: TemplateCriterion[];
}

export interface EvaluationTemplateData {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  version: string;
  categories: TemplateCategory[];
}

export function useActiveTemplate() {
  return useQuery({
    queryKey: ['active-template'],
    queryFn: async (): Promise<EvaluationTemplateData | null> => {
      // Fetch active template
      const { data: template, error: templateError } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (templateError) throw templateError;
      if (!template) return null;

      // Fetch categories for this template
      const { data: categories, error: catError } = await supabase
        .from('template_categories')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order');

      if (catError) throw catError;

      // Fetch all criteria for these categories
      const categoryIds = categories?.map(c => c.id) || [];
      const { data: criteria, error: critError } = await supabase
        .from('template_criteria')
        .select('*')
        .in('category_id', categoryIds)
        .order('sort_order');

      if (critError) throw critError;

      // Build the nested structure
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
