import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyScope } from './useCompanyScope';
import { toast } from 'sonner';

export interface Visit {
  id: string;
  company_id: string;
  branch_id: string | null;
  patient_id: string;
  appointment_id: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  visit_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  treatment: string | null;
  prescription: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string } | null;
}

export function useVisits() {
  const { companyId, scopeKey } = useCompanyScope();
  return useQuery({
    queryKey: ['visits', scopeKey],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('*, patient:patients(id, full_name)')
        .eq('company_id', companyId!)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return data as Visit[];
    },
  });
}

export function useVisitMutations() {
  const qc = useQueryClient();
  const { companyId, scopeKey } = useCompanyScope();

  const create = useMutation({
    mutationFn: async (input: Partial<Visit>) => {
      if (!companyId) throw new Error('No workspace selected');
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('visits')
        .insert({
          ...input,
          patient_id: input.patient_id!,
          company_id: companyId,
          created_by: userRes.user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits', scopeKey] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Visit> & { id: string }) => {
      const { data, error } = await supabase
        .from('visits')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits', scopeKey] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('visits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits', scopeKey] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { create, update, remove };
}
