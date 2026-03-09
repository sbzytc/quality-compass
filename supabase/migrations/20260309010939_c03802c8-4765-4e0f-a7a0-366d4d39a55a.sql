ALTER TABLE public.support_tickets 
  DROP CONSTRAINT IF EXISTS support_tickets_created_by_fkey,
  ADD CONSTRAINT support_tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(user_id);

ALTER TABLE public.support_tickets 
  DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey,
  ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(user_id);

ALTER TABLE public.support_tickets 
  DROP CONSTRAINT IF EXISTS support_tickets_resolved_by_fkey,
  ADD CONSTRAINT support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES profiles(user_id);

ALTER TABLE public.ticket_comments 
  DROP CONSTRAINT IF EXISTS ticket_comments_user_id_fkey,
  ADD CONSTRAINT ticket_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id);