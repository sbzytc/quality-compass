import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_site_theme",
  title: "Get landing site theme",
  description:
    "Return the theme applied to Rasdah's public landing site (rasdah.com). Independent from any company theme.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const sb = client(ctx);
    const { data, error } = await sb
      .from("site_settings")
      .select("key, theme, updated_at")
      .eq("key", "landing")
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Failed: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data?.theme ?? {}, null, 2) }],
      structuredContent: { site: data ?? { key: "landing", theme: {} } },
    };
  },
});