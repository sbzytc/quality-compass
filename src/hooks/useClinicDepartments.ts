import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { toast } from 'sonner';

export interface ClinicDepartment {
  id: string;
  branch_id: string;
  company_id: string;
  code: string;
  name: string;
  name_ar: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClinicDepartments(branchId?: string) {
  const { currentCompany } = useCurrentCompany();
  return useQuery({
    queryKey: ['clinic-departments', currentCompany?.id, branchId || 'all'],
    enabled: !!currentCompany?.id,
    queryFn: async () => {
      let q = supabase
        .from('clinic_departments')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('sort_order', { ascending: true });
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ClinicDepartment[];
    },
  });
}

export function useUpsertDepartment() {
  const qc = useQueryClient();
  const { currentCompany } = useCurrentCompany();
  return useMutation({
    mutationFn: async (input: Partial<ClinicDepartment> & { branch_id: string; name: string; code: string }) => {
      if (!currentCompany) throw new Error('No company');
      const payload = { ...input, company_id: currentCompany.id };
      const { data, error } = input.id
        ? await supabase.from('clinic_departments').update(payload).eq('id', input.id).select().single()
        : await supabase.from('clinic_departments').insert(payload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-departments'] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-departments'] });
      qc.invalidateQueries({ queryKey: ['clinic-rooms'] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
