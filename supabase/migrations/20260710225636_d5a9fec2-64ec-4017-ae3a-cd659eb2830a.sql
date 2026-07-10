
-- Add is_sandbox flag
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT false;

-- Seed sandbox companies (F&B + Clinics)
INSERT INTO public.companies (id, name, name_ar, slug, sector_type, workspace_type, primary_module, status, is_sandbox)
VALUES
  (gen_random_uuid(), 'Rasdah Sandbox — F&B', 'رصدة التجريبية — المطاعم', 'sandbox-fnb', 'fnb', 'food', 'food_restaurants', 'active', true),
  (gen_random_uuid(), 'Rasdah Sandbox — Clinics', 'رصدة التجريبية — العيادات', 'sandbox-clinics', 'clinic', 'medical', 'medical_clinics', 'active', true)
ON CONFLICT (slug) DO UPDATE SET is_sandbox = true;

-- Attach super admin as owner in both sandbox companies
INSERT INTO public.company_users (user_id, company_id, role, is_active)
SELECT '87394229-4fc5-42c5-8dd9-7ac7be2f6b99'::uuid, c.id, 'owner', true
FROM public.companies c
WHERE c.slug IN ('sandbox-fnb', 'sandbox-clinics')
ON CONFLICT (user_id, company_id) DO UPDATE SET role='owner', is_active=true;
