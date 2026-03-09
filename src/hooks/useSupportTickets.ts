import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketSource = 'app' | 'phone' | 'system';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  category: string;
  created_by: string;
  branch_id?: string;
  assigned_to?: string;
  attachments: string[];
  screen_name?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  creator?: { full_name: string; email: string };
  assignee?: { full_name: string; email: string };
}

export const useSupportTickets = () => {
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any as SupportTicket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (newTicket: Partial<SupportTicket>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({ ...newTicket, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async (updates: { id: string } & Partial<SupportTicket>) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from('support_tickets')
        .update(rest as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  return {
    tickets,
    isLoading,
    createTicket,
    updateTicket
  };
};