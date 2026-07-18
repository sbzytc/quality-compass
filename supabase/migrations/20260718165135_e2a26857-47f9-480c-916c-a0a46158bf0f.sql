
-- Tighten user_roles write policies: only super admins may write the super_admin role.
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (private.has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role)
  OR private.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  (private.has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role)
  OR private.is_super_admin(auth.uid())
)
WITH CHECK (
  (private.has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role)
  OR private.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  (private.has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role)
  OR private.is_super_admin(auth.uid())
);

-- Defense-in-depth trigger: block writes of super_admin role by non-super-admins.
CREATE OR REPLACE FUNCTION public.enforce_super_admin_role_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'super_admin'::app_role THEN
    IF caller IS NULL OR NOT private.is_super_admin(caller) THEN
      RAISE EXCEPTION 'Only super admins can assign the super_admin role';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.role = 'super_admin'::app_role OR OLD.role = 'super_admin'::app_role)
       AND (caller IS NULL OR NOT private.is_super_admin(caller)) THEN
      RAISE EXCEPTION 'Only super admins can modify the super_admin role';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin'::app_role
       AND (caller IS NULL OR NOT private.is_super_admin(caller)) THEN
      RAISE EXCEPTION 'Only super admins can remove the super_admin role';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_super_admin_role_writes_ins ON public.user_roles;
DROP TRIGGER IF EXISTS enforce_super_admin_role_writes_upd ON public.user_roles;
DROP TRIGGER IF EXISTS enforce_super_admin_role_writes_del ON public.user_roles;

CREATE TRIGGER enforce_super_admin_role_writes_ins
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_role_writes();

CREATE TRIGGER enforce_super_admin_role_writes_upd
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_role_writes();

CREATE TRIGGER enforce_super_admin_role_writes_del
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_role_writes();
