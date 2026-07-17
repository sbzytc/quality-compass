// Edge function: reset a sandbox company (delete + re-clone from real).
// Requires the caller to be an admin/owner of the underlying real company.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing bearer token" }, 401, cors);
    }
    const jwt = authHeader.slice("Bearer ".length);

    // Verify caller identity using anon client + user JWT
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Invalid token" }, 401, cors);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const sandboxCompanyId = body?.sandbox_company_id as string | undefined;
    if (!sandboxCompanyId) return json({ error: "sandbox_company_id required" }, 400, cors);

    // Service role for privileged reads/writes
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Look up sandbox → real
    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("id, is_sandbox, sandbox_of_company_id")
      .eq("id", sandboxCompanyId)
      .maybeSingle();
    if (cErr || !company) return json({ error: "Company not found" }, 404, cors);
    if (!company.is_sandbox || !company.sandbox_of_company_id) {
      return json({ error: "Not a sandbox company" }, 400, cors);
    }
    const realCompanyId = company.sandbox_of_company_id as string;

    // Authorization: caller must be super_admin OR company admin/owner of real company
    const [{ data: roles }, { data: membership }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", userId),
      admin
        .from("company_users")
        .select("role, is_active")
        .eq("user_id", userId)
        .eq("company_id", realCompanyId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    const isSuperAdmin = (roles || []).some((r: any) => r.role === "super_admin");
    const isCompanyAdmin =
      membership && ["owner", "admin"].includes((membership as any).role);
    if (!isSuperAdmin && !isCompanyAdmin) {
      return json({ error: "Not permitted" }, 403, cors);
    }

    // Delete sandbox company (CASCADEs child rows); trigger will not re-fire
    // because is_sandbox=true won't auto-clone.
    const { error: dErr } = await admin
      .from("companies")
      .delete()
      .eq("id", sandboxCompanyId);
    if (dErr) return json({ error: dErr.message }, 500, cors);

    // Re-clone from real via private function
    const { data: newIdData, error: rErr } = await admin.rpc(
      "clone_company_as_sandbox" as any,
      { _source_company_id: realCompanyId },
      { count: undefined } as any,
    );
    if (rErr) {
      // Retry via SQL if RPC not exposed (private schema)
      const { data: sqlData, error: sqlErr } = await admin
        .from("companies")
        .select("id")
        .eq("sandbox_of_company_id", realCompanyId)
        .maybeSingle();
      if (sqlErr || !sqlData) return json({ error: rErr.message }, 500, cors);
      return json({ new_sandbox_company_id: sqlData.id }, 200, cors);
    }
    return json({ new_sandbox_company_id: newIdData }, 200, cors);
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, 500, cors);
  }
});

function json(body: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}