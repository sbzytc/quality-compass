import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const hslTriple = z
  .string()
  .regex(/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/, "Must be an HSL triple like '217 72% 42%'");

const themeSchema = z
  .object({
    colors: z
      .object({
        primary: hslTriple.optional(),
        primaryForeground: hslTriple.optional(),
        accent: hslTriple.optional(),
        accentForeground: hslTriple.optional(),
        background: hslTriple.optional(),
        foreground: hslTriple.optional(),
        ring: hslTriple.optional(),
      })
      .optional(),
    radius: z.string().regex(/^\d+(\.\d+)?(rem|px)$/).optional(),
    shadows: z
      .object({
        soft: z.string().optional(),
        medium: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export default defineTool({
  name: "apply_site_theme",
  title: "Apply landing site theme",
  description:
    "Overwrite the theme of Rasdah's public landing site (rasdah.com). Requires a signed-in super admin. Colors must be HSL triples like '217 72% 42%'.",
  inputSchema: {
    theme: themeSchema.describe("Theme object with optional colors, radius, and shadows."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ theme }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = client(ctx);
    const { data, error } = await sb
      .from("site_settings")
      .upsert(
        { key: "landing", theme: theme as any, updated_at: new Date().toISOString(), updated_by: ctx.getUserId() },
        { onConflict: "key" },
      )
      .select("key, theme, updated_at")
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Failed: ${error.message}` }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "Not permitted. Only super admins can change the landing site theme." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: "Applied theme to the Rasdah landing site." }],
      structuredContent: { site: data },
    };
  },
});