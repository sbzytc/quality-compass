-- 1. clinic_departments table
CREATE TABLE public.clinic_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  company_id uuid NOT NULL,
  code text NOT NULL CHECK (code IN ('reception','exam','operation','lab','radiology','pharmacy','other')),
  name text NOT NULL,
  name_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinic_departments_branch ON public.clinic_departments(branch_id);
CREATE INDEX idx_clinic_departments_company ON public.clinic_departments(company_id);

ALTER TABLE public.clinic_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view departments in their company"
  ON public.clinic_departments FOR SELECT
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members insert departments in their company"
  ON public.clinic_departments FOR INSERT
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members update departments in their company"
  ON public.clinic_departments FOR UPDATE
  USING (user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins delete departments"
  ON public.clinic_departments FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE TRIGGER trg_clinic_departments_updated
  BEFORE UPDATE ON public.clinic_departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. clinic_rooms table
CREATE TABLE public.clinic_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.clinic_departments(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  company_id uuid NOT NULL,
  room_number text,
  name text NOT NULL,
  name_ar text,
  room_type text NOT NULL DEFAULT 'consultation' CHECK (room_type IN ('consultation','operation','recovery','imaging','triage','reception','pharmacy','lab','other')),
  capacity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','maintenance')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinic_rooms_department ON public.clinic_rooms(department_id);
CREATE INDEX idx_clinic_rooms_branch ON public.clinic_rooms(branch_id);
CREATE INDEX idx_clinic_rooms_company ON public.clinic_rooms(company_id);

ALTER TABLE public.clinic_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view rooms in their company"
  ON public.clinic_rooms FOR SELECT
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members insert rooms in their company"
  ON public.clinic_rooms FOR INSERT
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members update rooms in their company"
  ON public.clinic_rooms FOR UPDATE
  USING (user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins delete rooms"
  ON public.clinic_rooms FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

CREATE TRIGGER trg_clinic_rooms_updated
  BEFORE UPDATE ON public.clinic_rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Link appointments to rooms (optional)
ALTER TABLE public.appointments ADD COLUMN room_id uuid REFERENCES public.clinic_rooms(id) ON DELETE SET NULL;
CREATE INDEX idx_appointments_room ON public.appointments(room_id);

-- 4. Add new module
INSERT INTO public.modules (code, name, name_ar, description, is_core, available_for_sectors)
VALUES ('clinic_rooms', 'Departments & Rooms', 'الأقسام والغرف', 'Manage clinic departments and rooms hierarchy', false, ARRAY['clinic']::sector_type[])
ON CONFLICT (code) DO NOTHING;

-- 5. Seed data: for each clinic company, ensure a branch + departments + rooms
DO $$
DECLARE
  comp RECORD;
  branch_uuid uuid;
  dept_reception uuid;
  dept_exam uuid;
  dept_operation uuid;
  dept_lab uuid;
  module_uuid uuid;
BEGIN
  SELECT id INTO module_uuid FROM public.modules WHERE code = 'clinic_rooms';

  FOR comp IN SELECT id, name FROM public.companies WHERE sector_type = 'clinic' LOOP
    -- enable the module for this company
    INSERT INTO public.company_modules (company_id, module_id, enabled)
    VALUES (comp.id, module_uuid, true)
    ON CONFLICT DO NOTHING;

    -- find or create a default branch for this company
    SELECT id INTO branch_uuid FROM public.branches WHERE company_id = comp.id LIMIT 1;
    IF branch_uuid IS NULL THEN
      INSERT INTO public.branches (company_id, name, name_ar, city, is_active)
      VALUES (comp.id, comp.name || ' - Main', comp.name || ' - الفرع الرئيسي', 'Riyadh', true)
      RETURNING id INTO branch_uuid;
    END IF;

    -- skip if departments already exist for this branch
    IF EXISTS (SELECT 1 FROM public.clinic_departments WHERE branch_id = branch_uuid) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.clinic_departments (branch_id, company_id, code, name, name_ar, sort_order)
    VALUES (branch_uuid, comp.id, 'reception', 'Reception', 'الاستقبال', 1)
    RETURNING id INTO dept_reception;

    INSERT INTO public.clinic_departments (branch_id, company_id, code, name, name_ar, sort_order)
    VALUES (branch_uuid, comp.id, 'exam', 'Examination Rooms', 'غرف الفحص', 2)
    RETURNING id INTO dept_exam;

    INSERT INTO public.clinic_departments (branch_id, company_id, code, name, name_ar, sort_order)
    VALUES (branch_uuid, comp.id, 'operation', 'Operation Rooms', 'غرف العمليات', 3)
    RETURNING id INTO dept_operation;

    INSERT INTO public.clinic_departments (branch_id, company_id, code, name, name_ar, sort_order)
    VALUES (branch_uuid, comp.id, 'lab', 'Laboratory', 'المختبر', 4)
    RETURNING id INTO dept_lab;

    -- Reception rooms
    INSERT INTO public.clinic_rooms (department_id, branch_id, company_id, room_number, name, name_ar, room_type, capacity, status)
    VALUES (dept_reception, branch_uuid, comp.id, 'R-01', 'Front Desk', 'مكتب الاستقبال', 'reception', 2, 'available');

    -- Exam rooms
    INSERT INTO public.clinic_rooms (department_id, branch_id, company_id, room_number, name, name_ar, room_type, capacity, status)
    VALUES
      (dept_exam, branch_uuid, comp.id, 'E-01', 'Exam Room 1', 'غرفة فحص 1', 'consultation', 1, 'available'),
      (dept_exam, branch_uuid, comp.id, 'E-02', 'Exam Room 2', 'غرفة فحص 2', 'consultation', 1, 'occupied'),
      (dept_exam, branch_uuid, comp.id, 'E-03', 'Exam Room 3', 'غرفة فحص 3', 'consultation', 1, 'available');

    -- Operation rooms
    INSERT INTO public.clinic_rooms (department_id, branch_id, company_id, room_number, name, name_ar, room_type, capacity, status)
    VALUES
      (dept_operation, branch_uuid, comp.id, 'O-01', 'Operation Theater 1', 'غرفة عمليات 1', 'operation', 4, 'available'),
      (dept_operation, branch_uuid, comp.id, 'O-02', 'Recovery Room', 'غرفة إفاقة', 'recovery', 2, 'maintenance');

    -- Lab room
    INSERT INTO public.clinic_rooms (department_id, branch_id, company_id, room_number, name, name_ar, room_type, capacity, status)
    VALUES (dept_lab, branch_uuid, comp.id, 'L-01', 'Main Lab', 'المختبر الرئيسي', 'lab', 3, 'available');
  END LOOP;
END $$;