-- Create support_tickets table
CREATE TABLE public.support_tickets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', 
    priority TEXT NOT NULL DEFAULT 'medium', 
    source TEXT NOT NULL DEFAULT 'app', 
    category TEXT NOT NULL DEFAULT 'bug', 
    created_by UUID REFERENCES auth.users NOT NULL,
    branch_id UUID REFERENCES public.branches(id),
    assigned_to UUID REFERENCES auth.users,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support agents and admins can do all on tickets" 
ON public.support_tickets FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_agent'::app_role));

CREATE POLICY "Branch managers can view branch tickets"
ON public.support_tickets FOR SELECT
USING (EXISTS (SELECT 1 FROM public.branches b WHERE b.id = support_tickets.branch_id AND b.manager_id = auth.uid()));

CREATE POLICY "Users can manage their own tickets"
ON public.support_tickets FOR ALL
USING (created_by = auth.uid());

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create ticket_comments table
CREATE TABLE public.ticket_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users NOT NULL,
    comment TEXT NOT NULL,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible tickets"
ON public.ticket_comments FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'support_agent'::app_role) OR 
    (EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_comments.ticket_id AND st.created_by = auth.uid())) OR
    (EXISTS (
        SELECT 1 FROM public.support_tickets st 
        JOIN public.branches b ON st.branch_id = b.id 
        WHERE st.id = ticket_comments.ticket_id AND b.manager_id = auth.uid()
    ))
);

CREATE POLICY "Users can add comments to accessible tickets"
ON public.ticket_comments FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'support_agent'::app_role) OR 
    (EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_comments.ticket_id AND st.created_by = auth.uid())) OR
    (EXISTS (
        SELECT 1 FROM public.support_tickets st 
        JOIN public.branches b ON st.branch_id = b.id 
        WHERE st.id = ticket_comments.ticket_id AND b.manager_id = auth.uid()
    ))
);

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Support attachments are publicly accessible" 
ON storage.objects FOR SELECT USING (bucket_id = 'support-attachments');

CREATE POLICY "Authenticated users can upload support attachments" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');