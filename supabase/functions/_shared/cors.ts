// Shared CORS helper with origin allow-list for all Lovable edge functions.
// Allows the Lovable preview subdomains, the published Lovable app URL,
// any custom domains (via ALLOWED_ORIGINS env — comma separated), plus
// localhost for local development.

const STATIC_ALLOWED = new Set<string>([
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "https://monitor-shine-suite.lovable.app",
]);

// Regex allow-list for preview/published Lovable domains.
const ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovable\.dev$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
];

function envOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED.has(origin)) return true;
  if (envOrigins().includes(origin)) return true;
  return ALLOWED_PATTERNS.some((r) => r.test(origin));
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = isAllowedOrigin(origin) ? (origin as string) : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}