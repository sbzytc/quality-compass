import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HCriterion {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  maxScore: number;
  weight: number;
  isCritical: boolean;
  sortOrder: number;
  violationValue: number | null;
  answerType: 'yes_no' | 'rating';
  yesIsPositive: boolean;
}

export interface HPriority {
  id: string;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  weight: number;
  sortOrder: number;
  criteria: HCriterion[];
}

export interface HFrequency {
  id: string;
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
  sortOrder: number;
  priorities: HPriority[];
}

export interface HDomain {
  id: string;
  name: string;
  nameAr: string | null;
  sortOrder: number;
  frequencies: HFrequency[];
}

export interface TemplateHierarchy {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  version: string;
  domains: HDomain[];
}

export function useTemplateHierarchy() {
  return useQuery({
    queryKey: ['template-hierarchy'],
    queryFn: async (): Promise<TemplateHierarchy | null> => {
      const { data: template, error: tErr } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!template) return null;

      const { data: domains } = await supabase
        .from('template_domains')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order');
      const domainIds = (domains || []).map(d => d.id);

      const { data: freqs } = domainIds.length
        ? await supabase
            .from('template_frequencies')
            .select('*')
            .in('domain_id', domainIds)
            .order('sort_order')
        : { data: [] as any[] };
      const freqIds = (freqs || []).map((f: any) => f.id);

      const { data: prios } = freqIds.length
        ? await supabase
            .from('template_priorities')
            .select('*')
            .in('frequency_id', freqIds)
            .order('sort_order')
        : { data: [] as any[] };
      const prioIds = (prios || []).map((p: any) => p.id);

      const { data: criteria } = prioIds.length
        ? await supabase
            .from('template_criteria')
            .select('*')
            .in('priority_id', prioIds)
            .order('sort_order')
        : { data: [] as any[] };

      const hierarchy: TemplateHierarchy = {
        id: template.id,
        name: template.name,
        nameAr: template.name_ar,
        description: template.description,
        version: template.version,
        domains: (domains || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          nameAr: d.name_ar,
          sortOrder: d.sort_order,
          frequencies: (freqs || [])
            .filter((f: any) => f.domain_id === d.id)
            .map((f: any) => ({
              id: f.id,
              frequencyType: f.frequency_type,
              sortOrder: f.sort_order,
              priorities: (prios || [])
                .filter((p: any) => p.frequency_id === f.id)
                .map((p: any) => ({
                  id: p.id,
                  priorityLevel: p.priority_level,
                  weight: Number(p.weight ?? 0),
                  sortOrder: p.sort_order,
                  criteria: (criteria || [])
                    .filter((c: any) => c.priority_id === p.id)
                    .map((c: any) => ({
                      id: c.id,
                      name: c.name,
                      nameAr: c.name_ar,
                      description: c.description,
                      maxScore: c.max_score,
                      weight: Number(c.weight),
                      isCritical: c.is_critical,
                      sortOrder: c.sort_order,
                        violationValue: c.violation_value !== null && c.violation_value !== undefined ? Number(c.violation_value) : null,
                        answerType: (c.answer_type as any) ?? 'yes_no',
                        yesIsPositive: c.yes_is_positive ?? true,
                    })),
                })),
            })),
        })),
      };

      return hierarchy;
    },
  });
}
