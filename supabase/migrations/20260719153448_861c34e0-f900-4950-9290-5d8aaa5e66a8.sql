
DROP POLICY IF EXISTS "Company admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can delete roles" ON public.user_roles;

CREATE POLICY "Company admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  private.is_super_admin(auth.uid())
  OR (
    role <> 'super_admin'::app_role
    AND user_id <> auth.uid()
    AND private.is_admin_of_user(auth.uid(), user_id)
  )
);

CREATE POLICY "Company admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  private.is_super_admin(auth.uid())
  OR (
    role <> 'super_admin'::app_role
    AND user_id <> auth.uid()
    AND private.is_admin_of_user(auth.uid(), user_id)
  )
)
WITH CHECK (
  private.is_super_admin(auth.uid())
  OR (
    role <> 'super_admin'::app_role
    AND user_id <> auth.uid()
    AND private.is_admin_of_user(auth.uid(), user_id)
  )
);

CREATE POLICY "Company admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  private.is_super_admin(auth.uid())
  OR (
    role <> 'super_admin'::app_role
    AND user_id <> auth.uid()
    AND private.is_admin_of_user(auth.uid(), user_id)
  )
);
