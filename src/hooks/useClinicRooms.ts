import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { toast } from 'sonner';

export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface ClinicRoom {
  id: string;
  department_id: string;
  branch_id: string;
  company_id: string;
  room_number: string | null;
  name: string;
  name_ar: string | null;
  room_type: string;
  capacity: number;
  status: RoomStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClinicRooms(opts?: { branchId?: string; departmentId?: string }) {
  const { currentCompany } = useCurrentCompany();
  return useQuery({
    queryKey: ['clinic-rooms', currentCompany?.id, opts?.branchId || 'all', opts?.departmentId || 'all'],
    enabled: !!currentCompany?.id,
    queryFn: async () => {
      let q = supabase
        .from('clinic_rooms')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('room_number', { ascending: true });
      if (opts?.branchId) q = q.eq('branch_id', opts.branchId);
      if (opts?.departmentId) q = q.eq('department_id', opts.departmentId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ClinicRoom[];
    },
  });
}

export function useUpsertRoom() {
  const qc = useQueryClient();
  const { currentCompany } = useCurrentCompany();
  return useMutation({
    mutationFn: async (input: Partial<ClinicRoom> & { department_id: string; branch_id: string; name: string }) => {
      if (!currentCompany) throw new Error('No company');
      const payload = { ...input, company_id: currentCompany.id };
      const { data, error } = input.id
        ? await supabase.from('clinic_rooms').update(payload).eq('id', input.id).select().single()
        : await supabase.from('clinic_rooms').insert(payload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-rooms'] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-rooms'] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
