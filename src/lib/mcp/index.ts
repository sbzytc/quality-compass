import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listBranches from "./tools/list-branches";
import listFindings from "./tools/list-findings";
import recentEvaluations from "./tools/recent-evaluations";
import listCompanies from "./tools/list-companies";
import getCompanyTheme from "./tools/get-company-theme";
import applyCompanyTheme from "./tools/apply-company-theme";
import getSiteTheme from "./tools/get-site-theme";
import applySiteTheme from "./tools/apply-site-theme";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "rasdah-mcp",
  title: "Rasdah MCP",
  version: "0.1.0",
  instructions:
    "Tools for Rasdah, a quality-monitoring platform. All tools act as the signed-in user and respect row-level security. Read: `whoami`, `list_companies`, `list_branches`, `recent_evaluations`, `list_findings`, `get_company_theme`, `get_site_theme`. Write: `apply_company_theme` overwrites a company's theme (super admin or company admin only); `apply_site_theme` overwrites the public landing site theme at rasdah.com (super admin only). Colors are HSL triples like '217 72% 42%'.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listCompanies,
    listBranches,
    recentEvaluations,
    listFindings,
    getCompanyTheme,
    applyCompanyTheme,
    getSiteTheme,
    applySiteTheme,
  ],
});