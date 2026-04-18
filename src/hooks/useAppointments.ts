import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyScope } from './useCompanyScope';
import { toast } from 'sonner';

export interface Appointment {
  id: string;
  company_id: string;
  branch_id: string | null;
  patient_id: string;
  doctor_id: string | null;
  doctor_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  appointment_type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; phone: string | null } | null;
}

export function useAppointments() {
  const { companyId, scopeKey } = useCompanyScope();
  return useQuery({
    queryKey: ['appointments', scopeKey],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patient:patients(id, full_name, phone)')
        .eq('company_id', companyId!)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useAppointmentMutations() {
  const qc = useQueryClient();
  const { companyId, scopeKey } = useCompanyScope();

  const create = useMutation({
    mutationFn: async (input: Partial<Appointment>) => {
      if (!companyId) throw new Error('No workspace selected');
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...input,
          patient_id: input.patient_id!,
          scheduled_at: input.scheduled_at!,
          company_id: companyId,
          created_by: userRes.user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', scopeKey] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', scopeKey] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', scopeKey] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { create, update, remove };
}
