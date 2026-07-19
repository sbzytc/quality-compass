// One-click theme apply endpoint designed for AI tools/browsers that can only send
// simple GET requests (no custom headers, no request body). The full theme payload
// is carried in the URL as a base64-encoded JSON query parameter.
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
    .success { background: #ecfdf5; border: 1px solid #10b981; }
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
  <p class="muted">Rasdah Company Theme — Direct Apply</p>
</body>
</html>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
  );
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
  const apiKey = url.searchParams.get("api_key");
  const themeB64 = url.searchParams.get("theme");
  const rawSource = url.searchParams.get("source") || "ai-direct";
  const source = rawSource.replace(/[^a-zA-Z0-9\-_. ]/g, "").slice(0, 50) || "ai-direct";

  if (!companyId || !apiKey || !themeB64) {
    return html(
      "Missing Parameters",
      "<p>Required query parameters: <code>company_id</code>, <code>api_key</code>, and <code>theme</code> (base64 JSON).</p>",
      400
    );
  }

  let theme: unknown;
  try {
    const decoded = decodeBase64Url(themeB64);
    theme = JSON.parse(decoded);
  } catch {
    return html("Invalid Theme", "<p>The <code>theme</code> parameter could not be decoded as base64 JSON.</p>", 400);
  }

  if (theme !== null && !validTheme(theme)) {
    return html("Invalid Theme", "<p>The decoded theme object is not valid.</p>", 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Validate API key
  const prefix = apiKey.slice(0, 12);
  const hash = await sha256Hex(apiKey);
  const { data: keys, error: keyError } = await admin
    .from("company_theme_api_keys")
    .select("id, company_id, key_hash, revoked_at")
    .eq("key_prefix", prefix)
    .is("revoked_at", null);

  if (keyError) {
    return html("Database Error", "<p>Could not validate API key. Please try again later.</p>", 500);
  }

  const match = (keys || []).find((k) => k.key_hash === hash);
  if (!match) {
    return html("Unauthorized", "<p>The API key is invalid or revoked.</p>", 401);
  }
  if (match.company_id !== companyId) {
    return html("Forbidden", "<p>This API key does not belong to the requested company.</p>", 403);
  }

  // Fetch company info
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, name, name_ar, theme, slug")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    return html("Company Not Found", "<p>The requested company does not exist.</p>", 404);
  }

  // Save previous version
  if (company.theme) {
    await admin.from("company_theme_versions").insert({
      company_id: companyId,
      theme: company.theme,
      label: `Before ${source}`,
      source,
    });
  }

  // Apply theme
  const { error: updateError } = await admin
    .from("companies")
    .update({ theme: theme as any, theme_updated_at: new Date().toISOString() })
    .eq("id", companyId);

  if (updateError) {
    return html("Save Failed", `<p>Could not save theme: <code>${escapeHtml(updateError.message)}</code></p>`, 500);
  }

  // Record new version
  await admin.from("company_theme_versions").insert({
    company_id: companyId,
    theme: theme as any,
    label: `Applied via ${source}`,
    source,
  });

  // Mark key as used
  await admin
    .from("company_theme_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", match.id);

  const companyName = company.name_ar || company.name || company.slug;
  const safeThemeJson = escapeHtml(JSON.stringify(theme, null, 2));
  return html(
    "Theme Applied",
    `<p>Theme updated successfully for <strong>${escapeHtml(companyName)}</strong>.</p>
     <p class="muted">Source: ${escapeHtml(source)}</p>
     <pre>${safeThemeJson}</pre>`,
    200
  );
});
