import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyScope } from './useCompanyScope';
import { toast } from 'sonner';

export interface Patient {
  id: string;
  company_id: string;
  branch_id: string | null;
  file_number: string | null;
  full_name: string;
  full_name_ar: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePatients() {
  const { companyId, scopeKey } = useCompanyScope();

  const query = useQuery({
    queryKey: ['patients', scopeKey],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Patient[];
    },
  });

  return query;
}

export function usePatientMutations() {
  const qc = useQueryClient();
  const { companyId, scopeKey } = useCompanyScope();

  const create = useMutation({
    mutationFn: async (input: Partial<Patient>) => {
      if (!companyId) throw new Error('No workspace selected');
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('patients')
        .insert({
          ...input,
          full_name: input.full_name!,
          company_id: companyId,
          created_by: userRes.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients', scopeKey] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Patient> & { id: string }) => {
      const { data, error } = await supabase
        .from('patients')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients', scopeKey] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients', scopeKey] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { create, update, remove };
}
