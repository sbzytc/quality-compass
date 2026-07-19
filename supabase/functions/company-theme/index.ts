// Public API for reading/writing a company's theme.
// Auth: either super_admin JWT, or an x-api-key header matching a
// company_theme_api_keys row (unrevoked) whose company_id matches ?company_id or the body.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validTheme(t: unknown): t is Record<string, unknown> {
  if (!t || typeof t !== "object" || Array.isArray(t)) return false;
  const keys = Object.keys(t as Record<string, unknown>);
  return keys.length <= 40;
}

async function resolveAuth(req: Request, companyId: string | null) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const url = new URL(req.url);
  // Accept the API key from any of: x-api-key header, Authorization: Bearer <key>,
  // or ?api_key= query param (needed for tools that can't set custom headers,
  // e.g. Claude/ChatGPT web fetchers).
  const authHeaderRaw = req.headers.get("authorization") || "";
  const bearerKey = authHeaderRaw.toLowerCase().startsWith("bearer rsdah_")
    ? authHeaderRaw.slice(7).trim()
    : null;
  const apiKey =
    req.headers.get("x-api-key") ||
    bearerKey ||
    url.searchParams.get("api_key");
  if (apiKey) {
    const prefix = apiKey.slice(0, 12);
    const hash = await sha256Hex(apiKey);
    const { data: keys } = await admin
      .from("company_theme_api_keys")
      .select("id, company_id, key_hash, scopes, revoked_at")
      .eq("key_prefix", prefix)
      .is("revoked_at", null);
    const match = (keys || []).find((k) => k.key_hash === hash);
    if (!match) return { admin, error: json({ error: "invalid_api_key" }, 401) };
    if (companyId && companyId !== match.company_id) {
      return { admin, error: json({ error: "company_id_mismatch" }, 403) };
    }
    await admin
      .from("company_theme_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", match.id);
    return { admin, companyId: match.company_id, scopes: match.scopes as string[] };
  }

  // Fall back to JWT — must be super_admin
  const authHeader = authHeaderRaw || null;
  if (!authHeader) return { admin, error: json({ error: "unauthenticated" }, 401) };
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) return { admin, error: json({ error: "unauthenticated" }, 401) };
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id);
  const isSuper = (roles || []).some((r: any) => r.role === "super_admin");
  if (!isSuper) return { admin, error: json({ error: "forbidden" }, 403) };
  return { admin, companyId, scopes: ["theme:read", "theme:write"] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  let companyId = url.searchParams.get("company_id");
  let bodyTheme: unknown = undefined;

  if (req.method === "PUT" || req.method === "POST") {
    try {
      const body = await req.json();
      companyId = companyId || body?.company_id || null;
      bodyTheme = body?.theme;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
  }

  const auth = await resolveAuth(req, companyId);
  if (auth.error) return auth.error;
  companyId = auth.companyId!;
  if (!companyId) return json({ error: "company_id_required" }, 400);

  const { admin, scopes } = auth;

  if (req.method === "GET") {
    if (!scopes?.includes("theme:read"))
      return json({ error: "scope_missing", need: "theme:read" }, 403);
    const { data, error } = await admin
      .from("companies")
      .select("id, name, slug, theme, theme_updated_at, is_sandbox, sandbox_of_company_id")
      .eq("id", companyId)
      .maybeSingle();
    if (error || !data) return json({ error: "not_found" }, 404);
    let effectiveTheme = data.theme;
    let inheritedFrom: string | null = null;
    if (!effectiveTheme && data.is_sandbox && data.sandbox_of_company_id) {
      const { data: parent } = await admin
        .from("companies")
        .select("id, theme")
        .eq("id", data.sandbox_of_company_id)
        .maybeSingle();
      if (parent?.theme) {
        effectiveTheme = parent.theme;
        inheritedFrom = parent.id;
      }
    }
    return json({
      company_id: data.id,
      slug: data.slug,
      theme: data.theme,
      effective_theme: effectiveTheme,
      inherited_from: inheritedFrom,
      updated_at: data.theme_updated_at,
    });
  }

  if (req.method === "PUT" || req.method === "POST") {
    if (!scopes?.includes("theme:write"))
      return json({ error: "scope_missing", need: "theme:write" }, 403);
    if (bodyTheme !== null && !validTheme(bodyTheme))
      return json({ error: "invalid_theme" }, 400);
    const { error } = await admin
      .from("companies")
      .update({ theme: bodyTheme ?? null, theme_updated_at: new Date().toISOString() })
      .eq("id", companyId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, company_id: companyId, theme: bodyTheme ?? null });
  }

  return json({ error: "method_not_allowed" }, 405);
});