// Shared helpers for enforcing tenant-admin scoping in privileged edge functions.
// A caller may act on a target user only if the caller is a super_admin, is
// operating on themselves, or is an active admin/owner in at least one of the
// target user's active company memberships. Similarly, a caller may write to
// a specific companyId only if they administer that company (or are a
// super_admin).

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

export async function isSuperAdmin(admin: SupabaseAdmin, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}

async function callerAdminCompanies(admin: SupabaseAdmin, callerId: string): Promise<string[]> {
  const { data } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", callerId)
    .eq("is_active", true)
    .in("role", ["owner", "admin"]);
  return (data ?? []).map((r: { company_id: string }) => r.company_id);
}

async function targetCompanies(admin: SupabaseAdmin, targetUserId: string): Promise<string[]> {
  const { data } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", targetUserId)
    .eq("is_active", true);
  return (data ?? []).map((r: { company_id: string }) => r.company_id);
}

/** True if caller may administer the given target user. */
export async function canAdministerUser(
  admin: SupabaseAdmin,
  callerId: string,
  targetUserId: string,
): Promise<boolean> {
  if (callerId === targetUserId) return true;
  if (await isSuperAdmin(admin, callerId)) return true;
  const [callerCos, targetCos] = await Promise.all([
    callerAdminCompanies(admin, callerId),
    targetCompanies(admin, targetUserId),
  ]);
  if (!callerCos.length || !targetCos.length) return false;
  const set = new Set(callerCos);
  return targetCos.some((c) => set.has(c));
}

/** True if caller may act on the given companyId (admin of it or super_admin). */
export async function canAdministerCompany(
  admin: SupabaseAdmin,
  callerId: string,
  companyId: string,
): Promise<boolean> {
  if (await isSuperAdmin(admin, callerId)) return true;
  const { data } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", callerId)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  return !!data;
}