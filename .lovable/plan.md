
# Security Review — Rasdah

Read-only audit. Grouped by severity with file + issue for each finding. No changes made.

## Critical

**1. `supabase/functions/update-user-email/index.ts` — account takeover via unauthenticated admin endpoint.**
The function uses `SUPABASE_SERVICE_ROLE_KEY` and calls `supabaseAdmin.auth.admin.updateUserById(userId, { email, email_confirm: true })` with **no `Authorization` check, no role check, and no ownership check**. The request body's `userId` is trusted verbatim.
- The function is not listed in `supabase/config.toml` `[functions.*]` so it defaults to `verify_jwt = true`, meaning any signed-in low-privilege user (assessor, branch_employee, even a public feedback submitter if anon key is used) can change the email of any account they name — including super_admin — and because `email_confirm: true` is passed, the change is auto-confirmed. Combined with a password reset from the new address, this is full account takeover.
- Fix direction (do not implement now): add `Authorization` header check, `auth.getClaims`, verify caller is `admin`/`super_admin`, and validate email format; either scope to `userId === caller` or restrict to admin-managed users.

**2. `profiles` RLS — `Users can update own profile` allows privilege escalation via column write.**
Policy `Users can update own profile` on `public.profiles` is `USING (auth.uid() = user_id)` with no `WITH CHECK` and no column list. `profiles` contains privilege/scope columns any user can flip on themselves:
- `ai_assistant_enabled` — the `ai-assistant` edge function (line ~440–445) gates access purely on this column, so any user can grant themselves AI Assistant access and burn LOVABLE_API_KEY credits.
- `can_view_customer_feedback`, `can_view_complaints`, `can_view_suggestions` — client-side feature gates that unlock sensitive customer PII pages.
- `branch_id`, `region_id`, `default_company_id` — read by multiple hooks/dashboards to scope data; a user can point themselves at another company/branch.
- `is_active` — a deactivated user can re-enable themselves.
- `direct_manager_id`, `job_title` — impersonation/social-engineering aid.
- Fix direction: replace with a `WITH CHECK` policy that only permits a whitelist of self-editable columns (e.g. `full_name`, `phone`, `avatar_url`), and route privileged column changes through an admin edge function or `profile_change_requests`.

## High

**3. `public.notifications` — `System can create notifications` allows any signed-in user to spam any inbox.**
`WITH CHECK (auth.uid() IS NOT NULL)` — no constraint that `user_id = auth.uid()` or that the caller has an admin/agent role. Any authenticated user can insert arbitrary titles/bodies/`reference_id`s to any other user's notifications feed (phishing surface, since notifications link into the app). Same table's SELECT/UPDATE are correctly scoped to owner; INSERT is not.

**4. `src/components/RolePermissionsManager.tsx` — role permissions matrix stored in `localStorage`.**
`localStorage.getItem/setItem('role_permissions', ...)` is the source of truth for what each role can do in this UI. It is trivially editable in DevTools. Not currently a full authZ bypass because the sidebar and most pages also consult `roles` from Supabase and RLS enforces data access, but any component that consults `permissions` directly (grep for `role_permissions` usage) inherits a client-trusted decision. This must never be the sole gate for a privileged action.

**5. `public.customer_complaints` — `Anyone can submit complaints` is unverified.**
Anon INSERT policy checks only `feedback_id IS NOT NULL`, `branch_id IS NOT NULL`, and text length. It does not verify the `feedback_id` references an existing recent `customer_feedbacks` row, and it does not verify the `branch_id` is real/active. Same class of issue that was fixed for `customer_feedback_scores`. Enables injection of arbitrary complaint text against arbitrary branches from anon, and log/table pollution.

**6. `supabase/functions/ai-assistant/index.ts` — `verify_jwt = false` + unauthenticated public entrypoint.**
`config.toml` sets `verify_jwt = false` for both `ai-assistant` and `create-user`. The function does authenticate internally (getUser + `ai_assistant_enabled` check), so authorized use is safe — but the endpoint is reachable by anonymous callers who can force it to execute request parsing, DB profile lookup, and return 401. Combined with `*` CORS, this is a cheap unauthenticated DoS / probing vector against a function that also holds the Lovable AI Gateway credit-bearing key. `create-user` also carries `verify_jwt = false` but auth-checks internally — same DoS surface.

## Medium

**7. Weak password policy in edge functions.**
`supabase/functions/create-user/index.ts` line ~97 enforces only `password.length < 6`. `src/pages/LoginPage.tsx` line ~141 same threshold on the force-change flow. No complexity, no HIBP check. Combined with `email_confirm: true` and admin-set initial passwords in `useUsers.ts`, weak temp passwords may persist if users skip the force-change (which `handleSkipPasswordChange` in `LoginPage.tsx:170` allows).

**8. `LoginPage.tsx` — force-password-change is skippable.**
`handleSkipPasswordChange` lets a user with `force_password_change = true` bypass the prompt entirely and continue to the app. The `force_password_change` flag on `profiles` is only cleared on successful change, so functionally the guard is advisory. Should be blocking, or the flag should also block session usage server-side.

**9. File upload validation is client-side only.**
- Size limit `file.size > 5 * 1024 * 1024` and `accept="image/*"` are set in `EvaluationForm.tsx:824`, `PeriodEvaluationForm.tsx:213`, `FindingsPage.tsx:179/249`, `support/MyTickets.tsx`, and `AddBranchDialog.tsx`. Both are trivially bypassed by a direct Storage API call.
- No server-side MIME/type/size enforcement (Storage bucket policies check only path/ownership).
- `support/MyTickets.tsx:123` derives filename from `Math.random().toString(36).substring(2, 15)` — collision-prone and predictable; not security-critical because RLS now scopes reads, but should use `crypto.randomUUID()`.

**10. `supabase/functions/invite-user/index.ts` — temp password entropy.**
Line ~90: `crypto.randomUUID().slice(0, 12) + "Aa1!"`. 12 hex chars from a UUID = ~48 bits of entropy plus a fixed suffix pattern that is trivially guessable if an attacker knows the scheme. Emailed to a Resend inbox that may be less protected than the app. Acceptable if users are forced to change on first login — but see finding 8, skip is allowed.

**11. `supabase/functions/*` — CORS `Access-Control-Allow-Origin: *` on authenticated admin endpoints.**
`create-user`, `invite-user`, `resend-invitation`, `reset-user-password`, `update-user-email`, `ai-assistant`, and `mcp` all reply with `*`. For pure-auth endpoints Supabase's JWT check protects data, but wildcard CORS enables cross-origin CSRF-style invocation from any site the victim visits while logged in. Prefer a same-origin allow-list (published domain + preview).

**12. `.env` published `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.**
These are meant to be public (`anon` key) — flagged only to confirm classification. No `SUPABASE_SERVICE_ROLE_KEY` or other secret was found in client code or committed files. `ripgrep` for `sk_live`, `sk_test`, `service_role`, `api_key` returns only i18n strings, hook parameter names, and column names — no hardcoded secret.

## Low

**13. `src/components/ui/chart.tsx:70` — `dangerouslySetInnerHTML` for CSS variables.**
Content is derived from `config.color` values passed by developers via chart config, not from user input, and is wrapped in a CSS selector context. Low risk, but worth a comment noting values must remain developer-controlled — do not feed user-supplied strings into `ChartStyle`.

**14. `src/contexts/CurrentCompanyContext.tsx` and `LanguageContext.tsx` — `localStorage` writes.**
Store selected `company_id` and UI language only. Non-sensitive; RLS still enforces which companies a user can read. No action needed.

**15. Console error logging.**
`AuthContext.tsx:94/104/109` and `SettingsPage.tsx:129` log fetch errors. No tokens, passwords, or PII are printed. Fine.

**16. `Anyone can view active questions` on `public.customer_feedback_questions`.**
`SELECT` policy `USING (true)` for role `public`. Intentional — the public feedback portal needs this. Documented, not a finding beyond confirming intent.

**17. Auto-confirm email in admin-created users.**
`create-user`, `invite-user`, `update-user-email` all pass `email_confirm: true`. This skips the ownership-proof step. Intentional for admin flows, but combined with finding 1 it turns email hijack into a one-step account takeover.

**18. Dependency vulnerabilities.**
`code--dependency_scan` reports no high/critical npm vulnerabilities. RLS-enabled on all 41 public tables (`pg_tables` scan returned 0 rows without RLS). Supabase linter is clean after last migration.

## Coverage summary

- **Auth & authorization:** section 1 (auth bypass in `update-user-email`), 2 (profile column escalation), 4 (client-side permission trust), 8 (skippable force-change).
- **Supabase / RLS:** all 41 public tables have RLS on. Overly permissive policies: `Users can update own profile`, `notifications` INSERT, `customer_complaints` INSERT.
- **API keys & secrets:** no hardcoded secrets in `src/**` or committed files. `.env` contains only public anon key/URL/project id (expected).
- **Input validation & injection:** All DB access via Supabase JS parameterized queries — no raw SQL from client. One `dangerouslySetInnerHTML` (chart CSS, developer-controlled). Zod is only used in the MCP tools; app forms rely on ad-hoc checks. No stored-XSS sink found for user-typed strings.
- **CORS / endpoint exposure:** wildcard CORS on all edge functions; two have `verify_jwt = false`.
- **Dependencies:** clean.
- **Client-side data exposure:** only non-sensitive UI state in localStorage; Supabase session is stored via the SDK's built-in `localStorage` adapter (SPA-standard, XSS is the only threat model).
- **File uploads:** client-side size/type only; server enforces bucket scoping via RLS (fixed last migration) but not MIME/size.
- **Third-party integrations:** Resend key used server-side only; no exposed webhook endpoints in this project.

## Recommended fix order when you switch to build mode

1. Fix `update-user-email` (Critical — account takeover).
2. Restrict `profiles` self-UPDATE to a safe column whitelist (Critical — privilege escalation).
3. Tighten `notifications` INSERT to `user_id = auth.uid()` or admin/agent role.
4. Scope `customer_complaints` INSERT to a recent parent feedback (mirror the feedback-scores fix).
5. Remove `localStorage`-backed role permissions or make it a UI-only preference clearly documented as non-authoritative.
6. Add MIME/size enforcement, revisit password policy and force-change skip, tighten CORS, and add server-side email validation.
