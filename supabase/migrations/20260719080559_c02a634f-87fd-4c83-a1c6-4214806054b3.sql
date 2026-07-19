
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS theme jsonb,
  ADD COLUMN IF NOT EXISTS theme_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.company_theme_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['theme:read','theme:write'],
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS company_theme_api_keys_prefix_idx
  ON public.company_theme_api_keys(key_prefix) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS company_theme_api_keys_company_idx
  ON public.company_theme_api_keys(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_theme_api_keys TO authenticated;
GRANT ALL ON public.company_theme_api_keys TO service_role;

ALTER TABLE public.company_theme_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_manage_theme_api_keys" ON public.company_theme_api_keys;
CREATE POLICY "super_admin_manage_theme_api_keys"
  ON public.company_theme_api_keys FOR ALL
  TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));
