
-- =====================================================
-- WAVE 1 (Part 2): Multi-Tenant Foundation
-- =====================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.sector_type AS ENUM ('fnb', 'clinic', 'retail', 'factory', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.company_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  sector_type public.sector_type NOT NULL DEFAULT 'fnb',
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.company_role NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_company_users_user ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON public.company_users(company_id);

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  is_core BOOLEAN NOT NULL DEFAULT false,
  available_for_sectors public.sector_type[] DEFAULT ARRAY['fnb','clinic','retail','factory','other']::public.sector_type[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  max_users INTEGER,
  max_branches INTEGER,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, key)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id, created_at DESC);

-- =====================================================
-- ADD company_id TO EXISTING TABLES
-- =====================================================
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.customer_feedbacks ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.customer_complaints ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.operations_tasks ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.system_logs ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_company_id UUID;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_users WHERE user_id = _user_id AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id AND is_active = true
  ) OR public.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id
      AND role IN ('owner','admin') AND is_active = true
  ) OR public.is_super_admin(_user_id)
$$;

-- =====================================================
-- DATA MIGRATION
-- =====================================================
DO $$
DECLARE
  v_company_id UUID;
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM public.companies WHERE slug = 'rasdah-default' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, name_ar, slug, sector_type, status)
    VALUES ('Rasdah Default', 'رصدة الافتراضية', 'rasdah-default', 'fnb', 'active')
    RETURNING id INTO v_company_id;
  END IF;

  UPDATE public.branches SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.regions SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.evaluations SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.evaluation_templates SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.non_conformities SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.customer_feedbacks SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.customer_complaints SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.operations_tasks SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.support_tickets SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.system_logs SET company_id = v_company_id WHERE company_id IS NULL;
  UPDATE public.profiles SET default_company_id = v_company_id WHERE default_company_id IS NULL;

  INSERT INTO public.company_users (company_id, user_id, role)
  SELECT v_company_id, p.user_id,
    CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin')
         THEN 'owner'::public.company_role
         ELSE 'member'::public.company_role
    END
  FROM public.profiles p
  ON CONFLICT (company_id, user_id) DO NOTHING;

  -- Promote existing admins to super_admin (now safe — enum value committed)
  INSERT INTO public.user_roles (user_id, role)
  SELECT DISTINCT user_id, 'super_admin'::public.app_role
  FROM public.user_roles
  WHERE role = 'admin'
  ON CONFLICT DO NOTHING;

  -- Plans
  INSERT INTO public.plans (code, name, name_ar, price_monthly, price_yearly, max_users, max_branches, features) VALUES
    ('free', 'Free', 'مجاني', 0, 0, 5, 1, '{"modules":["quality_evaluations"]}'::jsonb),
    ('pro', 'Pro', 'احترافي', 99, 990, 25, 10, '{"modules":["quality_evaluations","customer_voice","support"]}'::jsonb),
    ('enterprise', 'Enterprise', 'مؤسسي', 499, 4990, NULL, NULL, '{"modules":"all"}'::jsonb)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_plan_id FROM public.plans WHERE code = 'enterprise' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE company_id = v_company_id) THEN
    INSERT INTO public.subscriptions (company_id, plan_id, status, billing_cycle)
    VALUES (v_company_id, v_plan_id, 'active', 'monthly');
  END IF;

  -- Modules
  INSERT INTO public.modules (code, name, name_ar, is_core, available_for_sectors) VALUES
    ('quality_evaluations', 'Quality Evaluations', 'تقييمات الجودة', true, ARRAY['fnb','clinic','retail','factory','other']::public.sector_type[]),
    ('customer_voice', 'Customer Voice', 'صوت العميل', false, ARRAY['fnb','clinic','retail']::public.sector_type[]),
    ('support', 'Support', 'الدعم الفني', false, ARRAY['fnb','clinic','retail','factory','other']::public.sector_type[]),
    ('operations', 'Operations', 'العمليات', false, ARRAY['fnb','clinic','retail','factory']::public.sector_type[]),
    ('clinic_management', 'Clinic Management', 'إدارة العيادات', false, ARRAY['clinic']::public.sector_type[]),
    ('ai_assistant', 'AI Assistant', 'المساعد الذكي', false, ARRAY['fnb','clinic','retail','factory','other']::public.sector_type[])
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO public.company_modules (company_id, module_id, enabled)
  SELECT v_company_id, m.id, true FROM public.modules m
  ON CONFLICT (company_id, module_id) DO NOTHING;
END $$;

-- =====================================================
-- ENABLE RLS + POLICIES
-- =====================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage companies" ON public.companies
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Members view their companies" ON public.companies
  FOR SELECT USING (public.user_belongs_to_company(auth.uid(), id));
CREATE POLICY "Company admins update their company" ON public.companies
  FOR UPDATE USING (public.is_company_admin(auth.uid(), id)) WITH CHECK (public.is_company_admin(auth.uid(), id));

CREATE POLICY "Super admins manage memberships" ON public.company_users
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Company admins manage memberships" ON public.company_users
  FOR ALL USING (public.is_company_admin(auth.uid(), company_id)) WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Users view their memberships" ON public.company_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone authenticated can view modules" ON public.modules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage modules" ON public.modules
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage company modules" ON public.company_modules
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Company admins manage their modules" ON public.company_modules
  FOR ALL USING (public.is_company_admin(auth.uid(), company_id)) WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Members view their company modules" ON public.company_modules
  FOR SELECT USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Anyone authenticated can view plans" ON public.plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage plans" ON public.plans
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Members view their subscription" ON public.subscriptions
  FOR SELECT USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Super admins manage feature flags" ON public.feature_flags
  FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Company admins manage flags" ON public.feature_flags
  FOR ALL USING (public.is_company_admin(auth.uid(), company_id)) WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Members view flags" ON public.feature_flags
  FOR SELECT USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Super admins view all audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Company admins view their audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_user_id);

-- super_admin overrides on existing tables
CREATE POLICY "Super admins view all branches" ON public.branches
  FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins view all evaluations" ON public.evaluations
  FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins view all templates" ON public.evaluation_templates
  FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins view all non_conformities" ON public.non_conformities
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
