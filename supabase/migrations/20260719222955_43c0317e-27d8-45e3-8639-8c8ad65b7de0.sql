CREATE TABLE public.company_theme_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'external-ai',
  theme jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_theme_proposals TO authenticated;
GRANT ALL ON public.company_theme_proposals TO service_role;

ALTER TABLE public.company_theme_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all theme proposals"
ON public.company_theme_proposals
FOR ALL
TO authenticated
USING (private.is_super_admin(auth.uid()))
WITH CHECK (private.is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company theme proposals"
ON public.company_theme_proposals
FOR ALL
TO authenticated
USING (private.is_company_admin(auth.uid(), company_id))
WITH CHECK (private.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER update_company_theme_proposals_updated_at
BEFORE UPDATE ON public.company_theme_proposals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();