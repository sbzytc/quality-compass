
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS gps text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS activity_type text,
  ADD COLUMN IF NOT EXISTS opened_at date,
  ADD COLUMN IF NOT EXISTS manager_name text,
  ADD COLUMN IF NOT EXISTS manager_phone text,
  ADD COLUMN IF NOT EXISTS area_m2 numeric,
  ADD COLUMN IF NOT EXISTS employees_count int,
  ADD COLUMN IF NOT EXISTS cameras_count int,
  ADD COLUMN IF NOT EXISTS extinguishers_count int,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.branches
  DROP CONSTRAINT IF EXISTS branches_status_check;
ALTER TABLE public.branches
  ADD CONSTRAINT branches_status_check CHECK (status IN ('active','closed','under_construction'));
