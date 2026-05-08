
-- Enforce module-sector compatibility and disable clinic_management for non-clinic sectors

-- 1) Disable any module assignments that don't match the company's sector
UPDATE public.company_modules cm
SET enabled = false
FROM public.companies c, public.modules m
WHERE cm.company_id = c.id
  AND cm.module_id = m.id
  AND m.available_for_sectors IS NOT NULL
  AND NOT (c.sector_type = ANY (m.available_for_sectors))
  AND cm.enabled = true;

-- 2) Trigger: prevent enabling a module for a sector it does not support
CREATE OR REPLACE FUNCTION public.enforce_module_sector_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sector sector_type;
  v_allowed sector_type[];
BEGIN
  SELECT sector_type INTO v_sector FROM public.companies WHERE id = NEW.company_id;
  SELECT available_for_sectors INTO v_allowed FROM public.modules WHERE id = NEW.module_id;
  IF v_allowed IS NOT NULL AND NOT (v_sector = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Module is not available for sector %', v_sector;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_modules_sector_compat ON public.company_modules;
CREATE TRIGGER trg_company_modules_sector_compat
BEFORE INSERT OR UPDATE ON public.company_modules
FOR EACH ROW
WHEN (NEW.enabled = true)
EXECUTE FUNCTION public.enforce_module_sector_compat();

-- 3) Restrict clinic_management & clinic_rooms strictly to clinic sector
UPDATE public.modules
SET available_for_sectors = ARRAY['clinic']::sector_type[]
WHERE code IN ('clinic_management','clinic_rooms');
