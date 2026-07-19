
CREATE TABLE public.company_theme_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  theme jsonb,
  label text,
  source text NOT NULL DEFAULT 'ui',
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_theme_versions_company ON public.company_theme_versions(company_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_theme_versions TO authenticated;
GRANT ALL ON public.company_theme_versions TO service_role;

ALTER TABLE public.company_theme_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view theme versions"
  ON public.company_theme_versions FOR SELECT
  TO authenticated
  USING (private.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert theme versions"
  ON public.company_theme_versions FOR INSERT
  TO authenticated
  WITH CHECK (private.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete theme versions"
  ON public.company_theme_versions FOR DELETE
  TO authenticated
  USING (private.is_super_admin(auth.uid()));

-- Capture history on theme changes
CREATE OR REPLACE FUNCTION public.capture_company_theme_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.theme IS DISTINCT FROM OLD.theme) THEN
    INSERT INTO public.company_theme_versions (company_id, theme, source, changed_by, label)
    VALUES (
      OLD.id,
      OLD.theme,
      COALESCE(current_setting('request.jwt.claim.role', true), 'ui'),
      auth.uid(),
      'Auto-saved before change'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_company_theme_history ON public.companies;
CREATE TRIGGER trg_capture_company_theme_history
  BEFORE UPDATE OF theme ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_company_theme_history();
