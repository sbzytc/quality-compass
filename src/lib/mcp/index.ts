import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listBranches from "./tools/list-branches";
import listFindings from "./tools/list-findings";
import recentEvaluations from "./tools/recent-evaluations";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "rasdah-mcp",
  title: "Rasdah MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for Rasdah, a quality-monitoring platform. All tools act as the signed-in user and respect the app's row-level security. Use `whoami` to check identity, `list_branches` for branches, `recent_evaluations` for latest submitted evaluations, and `list_findings` for non-conformities.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listBranches, recentEvaluations, listFindings],
});