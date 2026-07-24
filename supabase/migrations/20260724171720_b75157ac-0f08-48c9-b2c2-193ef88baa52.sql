
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admins can insert site settings" ON public.site_settings;
CREATE POLICY "Super admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update site settings" ON public.site_settings;
CREATE POLICY "Super admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));

-- Seed the landing row with an empty theme so the row is always present.
INSERT INTO public.site_settings (key, theme)
VALUES ('landing', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
