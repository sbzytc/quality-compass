import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TemplateCategory {
  id: string;
  name: string;
  nameAr?: string;
  weight: number;
  sortOrder: number;
  criteria: TemplateCriterion[];
}

export interface TemplateCriterion {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  maxScore: number;
  weight: number;
  isCritical: boolean;
  sortOrder: number;
}

export interface Template {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  version: string;
  isActive: boolean;
  categories: TemplateCategory[];
  createdAt: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      return data.map(t => ({
        id: t.id,
        name: t.name,
        nameAr: t.name_ar,
        description: t.description,
        version: t.version,
        isActive: t.is_active,
        createdAt: t.created_at,
      }));
    },
  });
}

export function useTemplateWithDetails(templateId: string) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (templateError) throw templateError;
      if (!template) return null;

      // Get categories
      const { data: categories, error: catError } = await supabase
        .from('template_categories')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');

      if (catError) throw catError;

      // Get all criteria for these categories
      const categoryIds = categories.map(c => c.id);
      const { data: criteria, error: critError } = await supabase
        .from('template_criteria')
        .select('*')
        .in('category_id', categoryIds)
        .order('sort_order');

      if (critError) throw critError;

      // Group criteria by category
      const criteriaByCategory = new Map<string, TemplateCriterion[]>();
      criteria.forEach(c => {
        const list = criteriaByCategory.get(c.category_id) || [];
        list.push({
          id: c.id,
          name: c.name,
          nameAr: c.name_ar,
          description: c.description,
          maxScore: c.max_score,
          weight: Number(c.weight),
          isCritical: c.is_critical,
          sortOrder: c.sort_order,
        });
        criteriaByCategory.set(c.category_id, list);
      });

      return {
        id: template.id,
        name: template.name,
        nameAr: template.name_ar,
        description: template.description,
        version: template.version,
        isActive: template.is_active,
        createdAt: template.created_at,
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          nameAr: c.name_ar,
          weight: Number(c.weight),
          sortOrder: c.sort_order,
          criteria: criteriaByCategory.get(c.id) || [],
        })),
      } as Template;
    },
    enabled: !!templateId,
  });
}

export function useTemplateStats() {
  return useQuery({
    queryKey: ['template-stats'],
    queryFn: async () => {
      const { data: templates, error } = await supabase
        .from('evaluation_templates')
        .select(`
          id,
          name,
          template_categories (
            id,
            template_criteria (id)
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      return templates.map(t => ({
        id: t.id,
        name: t.name,
        categoryCount: t.template_categories?.length || 0,
        criteriaCount: t.template_categories?.reduce(
          (sum, c) => sum + ((c as any).template_criteria?.length || 0), 
          0
        ) || 0,
      }));
    },
  });
}
