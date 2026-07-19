// Theme proposal endpoint designed for AI tools/browsers that can only send
// simple GET requests (no custom headers, no request body). It does NOT apply
// the theme directly. It only creates a pending proposal for a super admin or
// company admin to review and approve inside the app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function html(title: string, body: string, status = 200) {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.6; color: #1f2937; }
    .box { border-radius: 16px; padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .success { background: #eff6ff; border: 1px solid #3b82f6; }
    .error { background: #fef2f2; border: 1px solid #ef4444; }
    h1 { margin-top: 0; font-size: 1.5rem; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; }
    .muted { color: #6b7280; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="box ${status >= 400 ? 'error' : 'success'}">
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </div>
  <p class="muted">Rasdah Company Theme — AI Proposal</p>
</body>
</html>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
  );
}

function validTheme(t: unknown): t is Record<string, unknown> {
  if (!t || typeof t !== "object" || Array.isArray(t)) return false;
  const keys = Object.keys(t as Record<string, unknown>);
  return keys.length <= 40;
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return atob(padded);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return html("Method Not Allowed", "<p>This endpoint only accepts GET requests.</p>", 405);
  }

  const url = new URL(req.url);
  const companyId = url.searchParams.get("company_id");
  const themeB64 = url.searchParams.get("theme");
  const rawSource = url.searchParams.get("source") || "claude";
  const source = rawSource.replace(/[^a-zA-Z0-9\-_. ]/g, "").slice(0, 50) || "claude";

  if (!companyId || !themeB64) {
    return html(
      "Missing Parameters",
      "<p>Required query parameters: <code>company_id</code> and <code>theme</code> (base64 JSON).</p>",
      400
    );
  }

  let decodedPayload: unknown;
  try {
    const decoded = decodeBase64Url(themeB64);
    decodedPayload = JSON.parse(decoded);
  } catch {
    return html("Invalid Theme", "<p>The <code>theme</code> parameter could not be decoded as base64 JSON.</p>", 400);
  }

  const theme =
    decodedPayload && typeof decodedPayload === "object" && !Array.isArray(decodedPayload) && "theme" in decodedPayload
      ? (decodedPayload as Record<string, unknown>).theme
      : decodedPayload;

  if (theme !== null && !validTheme(theme)) {
    return html("Invalid Theme", "<p>The decoded theme object is not valid.</p>", 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Fetch company info
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, name, name_ar, slug")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    return html("Company Not Found", "<p>The requested company does not exist.</p>", 404);
  }

  const { count: pendingCount } = await admin
    .from("company_theme_proposals")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "pending");

  if ((pendingCount || 0) >= 20) {
    return html(
      "Too Many Pending Proposals",
      "<p>This company already has too many pending theme proposals. Please review or reject older proposals first.</p>",
      429
    );
  }

  const { data: proposal, error: insertError } = await admin.from("company_theme_proposals").insert({
    company_id: companyId,
    theme: theme as any,
    source,
  }).select("id, created_at").single();

  if (insertError) {
    return html("Proposal Failed", `<p>Could not save the proposal: <code>${escapeHtml(insertError.message)}</code></p>`, 500);
  }

  const companyName = company.name_ar || company.name || company.slug;
  const safeThemeJson = escapeHtml(JSON.stringify(theme, null, 2));
  return html(
    "Theme Proposal Created",
    `<p>A pending theme proposal was created for <strong>${escapeHtml(companyName)}</strong>.</p>
     <p>Nothing was applied yet. A Rasdah admin must review and approve it inside the Theme page.</p>
     <p class="muted">Source: ${escapeHtml(source)}</p>
     <p class="muted">Proposal ID: ${escapeHtml(proposal.id)}</p>
     <pre>${safeThemeJson}</pre>`,
    200
  );
});
