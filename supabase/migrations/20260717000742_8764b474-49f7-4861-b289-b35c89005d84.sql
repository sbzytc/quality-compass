
-- 1) Private schema for internal permission helpers (not exposed to the Data API)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- Recreate helpers inside private (SECURITY DEFINER stays, but not reachable via PostgREST)
CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id
      AND role IN ('owner','admin') AND is_active = true
  ) OR private.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION private.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id AND is_active = true
  ) OR private.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION private.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_users WHERE user_id = _user_id AND is_active = true
$$;

CREATE OR REPLACE FUNCTION private.get_user_roles(_user_id uuid)
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Helper for anonymous feedback flow (used in RLS on customer_feedback_scores)
CREATE OR REPLACE FUNCTION private.recent_feedback_exists(_feedback_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_feedbacks
    WHERE id = _feedback_id AND created_at >= now() - interval '5 minutes'
  )
$$;

GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_company_admin(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.user_belongs_to_company(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_company_ids(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_roles(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.recent_feedback_exists(uuid) TO authenticated, anon, service_role;

-- 2) Rewrite every existing policy that references the helpers so it uses private.*
DO $rewrite$
DECLARE
  r record;
  new_qual text;
  new_check text;
  role_list text;
  sql text;
  pattern text := '(^|[^a-zA-Z0-9_.])(has_role|is_super_admin|is_company_admin|user_belongs_to_company|get_user_company_ids|get_user_roles)\(';
BEGIN
  FOR r IN
    SELECT * FROM pg_policies
    WHERE schemaname IN ('public','storage')
      AND (COALESCE(qual,'') || ' ' || COALESCE(with_check,'')) ~ pattern
  LOOP
    new_qual := r.qual;
    new_check := r.with_check;
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, pattern, '\1private.\2(', 'g');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, pattern, '\1private.\2(', 'g');
    END IF;
    role_list := array_to_string(ARRAY(SELECT quote_ident(x) FROM unnest(r.roles) x), ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename, r.permissive, r.cmd, role_list);
    IF new_qual IS NOT NULL THEN sql := sql || ' USING (' || new_qual || ')'; END IF;
    IF new_check IS NOT NULL THEN sql := sql || ' WITH CHECK (' || new_check || ')'; END IF;
    EXECUTE sql;
  END LOOP;
END
$rewrite$;

-- 3) Drop the old public helpers (no policies reference them anymore).
--    Recreate get_user_roles as SECURITY INVOKER so the app RPC keeps working
--    (RLS on user_roles already restricts each user to their own rows).
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);
DROP FUNCTION IF EXISTS public.is_company_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.user_belongs_to_company(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_company_ids(uuid);
DROP FUNCTION IF EXISTS public.get_user_roles(uuid);

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF public.app_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;

-- 4) Storage: replace over-permissive read policies with company/ownership-scoped ones

-- Evaluation attachments: view
DROP POLICY IF EXISTS "Authenticated can view evaluation attachments" ON storage.objects;
CREATE POLICY "Scoped view evaluation attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'evaluation-attachments'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR private.is_super_admin(auth.uid())
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.evaluation_criterion_scores s
      WHERE storage.objects.name = ANY(s.attachments)
    )
    OR EXISTS (
      SELECT 1 FROM public.non_conformities nc
      WHERE storage.objects.name = ANY(nc.attachments)
         OR storage.objects.name = ANY(nc.resolution_attachments)
         OR storage.objects.name = ANY(nc.review_attachments)
    )
  )
);

-- Evaluation attachments: upload must be into uploader's own folder
DROP POLICY IF EXISTS "Authenticated users can upload evaluation attachments" ON storage.objects;
CREATE POLICY "Users upload to own evaluation folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evaluation-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Support attachments: view
DROP POLICY IF EXISTS "Authenticated can view support attachments" ON storage.objects;
CREATE POLICY "Scoped view support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (
    owner = auth.uid()
    OR private.is_super_admin(auth.uid())
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'support_agent'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE storage.objects.name = ANY(t.attachments)
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_comments c
      WHERE storage.objects.name = ANY(c.attachments)
    )
  )
);

-- 5) customer_feedback_scores: validate insert against a recent parent feedback
DROP POLICY IF EXISTS "Anyone can insert scores" ON public.customer_feedback_scores;
CREATE POLICY "Anyone can insert valid scores"
ON public.customer_feedback_scores
FOR INSERT
TO anon, authenticated
WITH CHECK (
  score BETWEEN 1 AND 5
  AND private.recent_feedback_exists(feedback_id)
  AND EXISTS (
    SELECT 1 FROM public.customer_feedback_questions q
    WHERE q.id = question_id AND q.is_active = true
  )
);
