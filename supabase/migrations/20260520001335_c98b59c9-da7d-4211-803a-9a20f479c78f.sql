ALTER TABLE public.template_criteria
  ADD COLUMN IF NOT EXISTS answer_type text NOT NULL DEFAULT 'yes_no',
  ADD COLUMN IF NOT EXISTS yes_is_positive boolean NOT NULL DEFAULT true;

-- Validate values via trigger (avoids immutable CHECK on text enum-like field)
CREATE OR REPLACE FUNCTION public.validate_template_criteria_answer_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.answer_type NOT IN ('yes_no','rating') THEN
    RAISE EXCEPTION 'answer_type must be either yes_no or rating';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_template_criteria_answer_type ON public.template_criteria;
CREATE TRIGGER trg_validate_template_criteria_answer_type
BEFORE INSERT OR UPDATE ON public.template_criteria
FOR EACH ROW EXECUTE FUNCTION public.validate_template_criteria_answer_type();