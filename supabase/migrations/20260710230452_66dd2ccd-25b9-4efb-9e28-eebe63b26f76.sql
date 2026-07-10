
CREATE TABLE IF NOT EXISTS public.super_admin_scopes (
  user_id UUID PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all','food','medical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admin_scopes TO authenticated;
GRANT ALL ON public.super_admin_scopes TO service_role;

ALTER TABLE public.super_admin_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view scopes"
  ON public.super_admin_scopes FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert scopes"
  ON public.super_admin_scopes FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update scopes"
  ON public.super_admin_scopes FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete scopes"
  ON public.super_admin_scopes FOR DELETE
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_super_admin_scopes_updated
  BEFORE UPDATE ON public.super_admin_scopes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed existing super admins with 'all' scope
INSERT INTO public.super_admin_scopes (user_id, scope)
SELECT user_id, 'all' FROM public.user_roles WHERE role = 'super_admin'
ON CONFLICT (user_id) DO NOTHING;
