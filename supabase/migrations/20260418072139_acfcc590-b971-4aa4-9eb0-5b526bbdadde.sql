
-- patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  file_number TEXT,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male','female','other')),
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_patients_company ON public.patients(company_id);
CREATE INDEX idx_patients_branch ON public.patients(branch_id);
CREATE UNIQUE INDEX idx_patients_company_filenum ON public.patients(company_id, file_number) WHERE file_number IS NOT NULL;

-- appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID,
  doctor_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  appointment_type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appts_company ON public.appointments(company_id);
CREATE INDEX idx_appts_patient ON public.appointments(patient_id);
CREATE INDEX idx_appts_scheduled ON public.appointments(scheduled_at);

-- visits
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  doctor_id UUID,
  doctor_name TEXT,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  chief_complaint TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visits_company ON public.visits(company_id);
CREATE INDEX idx_visits_patient ON public.visits(patient_id);

-- Triggers for updated_at
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_visits_updated_at BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Patients policies
CREATE POLICY "Members view patients in their company"
  ON public.patients FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members insert patients in their company"
  ON public.patients FOR INSERT
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members update patients in their company"
  ON public.patients FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins delete patients"
  ON public.patients FOR DELETE
  USING (public.is_company_admin(auth.uid(), company_id));

-- Appointments policies
CREATE POLICY "Members view appointments in their company"
  ON public.appointments FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members insert appointments in their company"
  ON public.appointments FOR INSERT
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members update appointments in their company"
  ON public.appointments FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins delete appointments"
  ON public.appointments FOR DELETE
  USING (public.is_company_admin(auth.uid(), company_id));

-- Visits policies
CREATE POLICY "Members view visits in their company"
  ON public.visits FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members insert visits in their company"
  ON public.visits FOR INSERT
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members update visits in their company"
  ON public.visits FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins delete visits"
  ON public.visits FOR DELETE
  USING (public.is_company_admin(auth.uid(), company_id));
