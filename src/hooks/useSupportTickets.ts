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
  resolver?: { full_name: string; email: string };
}

export const useSupportTickets = () => {
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          creator:profiles!support_tickets_created_by_fkey(full_name, email),
          assignee:profiles!support_tickets_assigned_to_fkey(full_name, email),
          resolver:profiles!support_tickets_resolved_by_fkey(full_name, email)
        `)
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
      const updateData: any = { ...rest };
      
      if (rest.status === 'resolved' || rest.status === 'closed') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolved_at = new Date().toISOString();
        if (user) updateData.resolved_by = user.id;
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update(updateData)
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

export const useTicketComments = (ticketId?: string) => {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['ticket-comments', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select(`
          *,
          user:profiles!ticket_comments_user_id_fkey(full_name, email)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ comment, attachments }: { comment: string, attachments?: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          comment,
          attachments
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const { data: ticket } = await supabase.from('support_tickets').select('created_by, assigned_to').eq('id', ticketId).single();
      if (ticket) {
        const notifyUserId = user.id === ticket.created_by ? ticket.assigned_to : ticket.created_by;
        if (notifyUserId) {
          await supabase.from('notifications').insert({
            user_id: notifyUserId,
            title: 'رد جديد على التذكرة',
            message: `تمت إضافة تعليق جديد على التذكرة`,
            type: 'ticket_comment',
            reference_id: ticketId,
            reference_type: 'support_ticket'
          });
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
    },
  });

  return { comments, isLoading, addComment };
};