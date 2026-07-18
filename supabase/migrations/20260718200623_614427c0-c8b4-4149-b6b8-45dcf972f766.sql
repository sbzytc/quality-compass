GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin_of_user(uuid, uuid) TO authenticated, service_role;