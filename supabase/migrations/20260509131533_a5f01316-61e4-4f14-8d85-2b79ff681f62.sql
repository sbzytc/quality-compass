-- 1) Extend modules table to support the new top-level "industry module" concept
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_system_module boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Mark existing fine-grained packs as shared core (not industry modules)
UPDATE public.modules
SET category = COALESCE(category, 'shared_core')
WHERE category IS NULL;

-- 2) Seed the two industry modules (idempotent via code uniqueness)
INSERT INTO public.modules (code, name, name_ar, description, is_core, is_system_module, category, available_for_sectors)
VALUES
  ('medical', 'Medical / Clinics', 'الطبي / العيادات',
   'Quality monitoring, assessments, findings, and corrective actions for clinics and medical facilities.',
   false, true, 'industry', ARRAY['clinic']::sector_type[]),
  ('food', 'Food / Restaurants', 'التغذية / المطاعم',
   'Quality monitoring, hygiene checks, assessments, findings, and corrective actions for restaurants, cafes, and food businesses.',
   false, true, 'industry', ARRAY['fnb']::sector_type[])
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      name_ar = EXCLUDED.name_ar,
      description = EXCLUDED.description,
      is_system_module = true,
      category = 'industry',
      available_for_sectors = EXCLUDED.available_for_sectors;

-- Backfill: enable the matching industry module for each existing company by sector
INSERT INTO public.company_modules (company_id, module_id, enabled)
SELECT c.id, m.id, true
FROM public.companies c
JOIN public.modules m ON (
  (c.sector_type = 'fnb'    AND m.code = 'food') OR
  (c.sector_type = 'clinic' AND m.code = 'medical')
)
ON CONFLICT DO NOTHING;

-- 3) Trigger to keep updated_at fresh on modules
DROP TRIGGER IF EXISTS trg_modules_updated_at ON public.modules;
CREATE TRIGGER trg_modules_updated_at
BEFORE UPDATE ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4) Add enabled_at / disabled_at on company_modules for audit
ALTER TABLE public.company_modules
  ADD COLUMN IF NOT EXISTS enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_module ON public.company_modules(company_id, module_id);