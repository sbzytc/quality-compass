# Rasdah Architecture Refactor: Single-Module Workspaces

## Goal
Move from "company can enable many modules" to **one Workspace = one primary module** (Medical *or* Food). Eliminate the module switcher inside a workspace and the `company_modules` many-to-many.

## Final Model
```
Workspace (= company)
  ├── workspace_type:    medical | food
  ├── primary_module:    medical_clinics | food_restaurants
  ├── branches/locations
  ├── assessment templates  (filtered by workspace_type)
  ├── assessments / findings / corrective actions / reports
  └── users (via user_workspaces, role-scoped)
```
A user can belong to many workspaces; each workspace shows only its own domain. Users with >1 workspace see a selector after login; users with 1 go straight in.

---

## Database Changes (single migration)

1. **`companies` (= workspaces)**
   - Add `workspace_type` enum: `medical`, `food` (nullable for backfill, then NOT NULL).
   - Add `primary_module` text: `medical_clinics` | `food_restaurants`.
   - Backfill: `sector_type='clinic'` → `medical`/`medical_clinics`; `sector_type='fnb'` → `food`/`food_restaurants`; `other` → leave null and require Super Admin to set type.
   - Keep `sector_type` for now (legacy), but stop using it as the source of truth.

2. **`company_modules` — deprecate**
   - Drop the table (or keep read-only and stop writing). Plan: drop after backfill since nothing should depend on it after the refactor.
   - Drop `enforce_module_sector_compat` trigger and helper.

3. **`modules` table — keep but simplified**
   - Keep only the two system rows (`medical`, `food`). Future types (`retail`, etc.) can be added but each is still single-module-per-workspace.
   - Remove the "create a custom module" admin flow.

4. **Tenant-scope columns** (already mostly present): ensure `branches`, `evaluation_templates`, `evaluations`, `non_conformities`, `corrective_actions`, `operations_tasks` all have `company_id` and that RLS uses `user_belongs_to_company`. Add missing `company_id` on `corrective_actions` and `non_conformity_history` derived via parent if needed (most already inherit through joins — leave RLS as-is, just verify).

5. **Templates filtering**
   - Add `workspace_type` to `evaluation_templates` (nullable, backfill from owning company). UI filters templates list by current workspace's `workspace_type`.

6. **`user_workspaces`**
   - Reuse existing `company_users` table — it already maps user→company with role. No new table; just rename in UI/types as "Workspace access".

---

## Frontend Changes

### Removed
- `src/components/ModuleGuard.tsx` usage as a per-module gate inside a workspace. Replace with a `WorkspaceTypeGuard` that checks `currentCompany.workspace_type === 'medical' | 'food'`.
- `src/pages/admin/ModulesPage.tsx` "create new module" dialog and the per-company module enable/disable matrix.
- Any in-app module switcher.

### Updated
- **`CurrentCompanyContext`**: expose `workspaceType` and `primaryModule`. `WorkspaceSwitcher` already exists — keep it (selecting between workspaces is allowed and required).
- **`App.tsx` routes**:
  - `/clinic/*` guarded by `WorkspaceTypeGuard type="medical"`.
  - Add `/food/*` group guarded by `type="food"` (or keep current branches/evaluation pages and just hide medical-specific menus when type=food, and vice versa).
- **`AppSidebar.tsx`**: render menu sections based on `workspaceType`. Medical workspace shows Clinics/Departments/Rooms; Food workspace shows Branches/Regions. Shared items (Assessments, Findings, Corrective Actions, Reports, Users, Settings) appear for both with type-aware labels.
- **Login redirect** (`Index.tsx` / post-auth): if user has 1 workspace → go to that workspace's dashboard (`/clinic` for medical, `/` for food). If >1 → show workspace selector page.
- **`CompaniesPage` (Super Admin)**: when creating a workspace, replace `sector_type` dropdown with a single `workspace_type` selector (Medical / Food). `primary_module` is set automatically. Hide "factory/retail/other" — only the 2 supported types.
- **Templates page**: filter by current workspace's `workspace_type`; hide cross-domain templates.
- **Dashboards**: keep `ClinicDashboard` for medical; food workspace lands on the existing CEO/Executive dashboard (rename labels). No type switching inside.

### Code Cleanup
- Remove `company_modules` reads in `useCompanyScope`/sidebar/route guards.
- Remove `available_for_sectors` checks.
- Update `src/types/index.ts` to add `WorkspaceType` and `PrimaryModule`.

---

## Migration Order
1. SQL migration: add columns, backfill, drop `company_modules` table + trigger, seed/normalize `modules`.
2. Update generated types (auto).
3. Refactor frontend (context, guards, routes, sidebar, admin pages, templates filter, login redirect).
4. Smoke-test: existing clinic company still loads `/clinic`; existing fnb company still loads root dashboard; super admin can create new workspace of either type.

## Out of Scope
- Holding/group structures.
- `retail` / `manufacturing` modules (schema-ready via `workspace_type` enum extension only).
- Multi-module workspaces (explicitly forbidden).
- Cross-workspace reporting.

---

## Risk / Notes
- Dropping `company_modules` is destructive; the migration backfills `companies.workspace_type` first so no functionality is lost.
- Any company currently with `sector_type='other'` will need Super Admin to pick a `workspace_type` before users can use it — surface this as a banner in the admin Companies page.

Approve this plan and I'll execute the migration + code refactor in one pass.
