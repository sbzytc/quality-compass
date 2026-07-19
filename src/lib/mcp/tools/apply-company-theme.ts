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
  name: "apply_company_theme",
  title: "Apply company theme",
  description:
    "Directly apply a theme to a Rasdah company. Requires the signed-in user to be a super admin or admin of the target company. Colors must be HSL triples like '217 72% 42%'. Overwrites the company's current theme.",
  inputSchema: {
    company_id: z.string().uuid().describe("Target company id."),
    theme: themeSchema.describe("Theme object with optional colors, radius, and shadows."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ company_id, theme }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = client(ctx);
    const { data, error } = await sb
      .from("companies")
      .update({ theme: theme as any, theme_updated_at: new Date().toISOString() })
      .eq("id", company_id)
      .select("id, name, slug, theme, theme_updated_at")
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Failed: ${error.message}` }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "Company not found or you do not have permission to update its theme." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Applied theme to ${data.name} (${data.slug}).` }],
      structuredContent: { company: data },
    };
  },
});