
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_company_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.companies WHERE code = candidate);
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'Could not generate unique company code'; END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Backfill without firing shape-enforcement trigger (legacy orphan sandboxes exist)
ALTER TABLE public.companies DISABLE TRIGGER USER;
UPDATE public.companies SET code = public.generate_company_code() WHERE code IS NULL;
ALTER TABLE public.companies ENABLE TRIGGER USER;

CREATE OR REPLACE FUNCTION public.set_company_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_company_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_company_code ON public.companies;
CREATE TRIGGER trg_set_company_code
BEFORE INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_company_code();

ALTER TABLE public.companies ALTER COLUMN code SET NOT NULL;
