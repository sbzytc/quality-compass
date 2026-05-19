
-- 1) Company off-days
CREATE TABLE public.company_off_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  day_of_week SMALLINT, -- 0=Sunday..6=Saturday
  specific_date DATE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT off_day_one_kind CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL)
    OR (day_of_week IS NULL AND specific_date IS NOT NULL)
  ),
  CONSTRAINT off_day_dow_range CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6))
);
CREATE INDEX idx_company_off_days_company ON public.company_off_days(company_id);
ALTER TABLE public.company_off_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view off days"
  ON public.company_off_days FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins manage off days"
  ON public.company_off_days FOR ALL
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- 2) Template Domains
CREATE TABLE public.template_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_template_domains_template ON public.template_domains(template_id);
ALTER TABLE public.template_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage domains"
  ON public.template_domains FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view domains"
  ON public.template_domains FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_template_domains_updated
BEFORE UPDATE ON public.template_domains
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3) Template Frequencies
CREATE TABLE public.template_frequencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.template_domains(id) ON DELETE CASCADE,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily','weekly','monthly','quarterly','semi_annual','yearly')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (domain_id, frequency_type)
);
CREATE INDEX idx_template_frequencies_domain ON public.template_frequencies(domain_id);
ALTER TABLE public.template_frequencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage frequencies"
  ON public.template_frequencies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view frequencies"
  ON public.template_frequencies FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_template_frequencies_updated
BEFORE UPDATE ON public.template_frequencies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4) Template Priorities
CREATE TABLE public.template_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frequency_id UUID NOT NULL REFERENCES public.template_frequencies(id) ON DELETE CASCADE,
  priority_level TEXT NOT NULL CHECK (priority_level IN ('critical','high','medium')),
  weight NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (frequency_id, priority_level)
);
CREATE INDEX idx_template_priorities_frequency ON public.template_priorities(frequency_id);
ALTER TABLE public.template_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage priorities"
  ON public.template_priorities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view priorities"
  ON public.template_priorities FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_template_priorities_updated
BEFORE UPDATE ON public.template_priorities
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5) Add priority_id to template_criteria (keep category_id for backward compat)
ALTER TABLE public.template_criteria
  ADD COLUMN IF NOT EXISTS priority_id UUID REFERENCES public.template_priorities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_template_criteria_priority ON public.template_criteria(priority_id);

-- 6) Evaluation schedules
CREATE TABLE public.evaluation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  frequency_id UUID NOT NULL REFERENCES public.template_frequencies(id) ON DELETE CASCADE,
  first_evaluation_date DATE NOT NULL,
  next_due_date DATE,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, frequency_id)
);
CREATE INDEX idx_eval_schedules_company ON public.evaluation_schedules(company_id);
CREATE INDEX idx_eval_schedules_branch ON public.evaluation_schedules(branch_id);
ALTER TABLE public.evaluation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view schedules"
  ON public.evaluation_schedules FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members manage schedules"
  ON public.evaluation_schedules FOR ALL
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_eval_schedules_updated
BEFORE UPDATE ON public.evaluation_schedules
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7) Helper function to compute next due date skipping off-days
CREATE OR REPLACE FUNCTION public.compute_next_due_date(
  _company_id UUID,
  _frequency_type TEXT,
  _from_date DATE
) RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_d DATE;
  guard INT := 0;
BEGIN
  next_d := CASE _frequency_type
    WHEN 'daily' THEN _from_date + INTERVAL '1 day'
    WHEN 'weekly' THEN _from_date + INTERVAL '7 days'
    WHEN 'monthly' THEN _from_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN _from_date + INTERVAL '3 months'
    WHEN 'semi_annual' THEN _from_date + INTERVAL '6 months'
    WHEN 'yearly' THEN _from_date + INTERVAL '1 year'
    ELSE _from_date + INTERVAL '1 day'
  END;

  -- Skip company off-days (weekly DOW or specific dates)
  WHILE guard < 60 AND EXISTS (
    SELECT 1 FROM public.company_off_days
    WHERE company_id = _company_id
      AND (
        (day_of_week IS NOT NULL AND day_of_week = EXTRACT(DOW FROM next_d)::int)
        OR (specific_date IS NOT NULL AND specific_date = next_d)
      )
  ) LOOP
    next_d := next_d + INTERVAL '1 day';
    guard := guard + 1;
  END LOOP;

  RETURN next_d;
END;
$$;

-- 8) Data migration: existing categories → domains + default yearly freq + priority based on is_critical
DO $$
DECLARE
  cat RECORD;
  new_domain_id UUID;
  new_freq_id UUID;
  new_priority_critical UUID;
  new_priority_medium UUID;
BEGIN
  FOR cat IN SELECT * FROM public.template_categories LOOP
    INSERT INTO public.template_domains (template_id, name, name_ar, sort_order)
    VALUES (cat.template_id, cat.name, cat.name_ar, cat.sort_order)
    RETURNING id INTO new_domain_id;

    INSERT INTO public.template_frequencies (domain_id, frequency_type, sort_order)
    VALUES (new_domain_id, 'yearly', 0)
    RETURNING id INTO new_freq_id;

    INSERT INTO public.template_priorities (frequency_id, priority_level, weight, sort_order)
    VALUES (new_freq_id, 'critical', 0, 0)
    RETURNING id INTO new_priority_critical;

    INSERT INTO public.template_priorities (frequency_id, priority_level, weight, sort_order)
    VALUES (new_freq_id, 'medium', cat.weight, 1)
    RETURNING id INTO new_priority_medium;

    UPDATE public.template_criteria
      SET priority_id = CASE WHEN is_critical THEN new_priority_critical ELSE new_priority_medium END
      WHERE category_id = cat.id;
  END LOOP;
END $$;
