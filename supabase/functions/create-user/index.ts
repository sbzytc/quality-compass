import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { canAdministerCompany, isSuperAdmin as checkIsSuperAdmin } from "../_shared/tenant-admin.ts";

interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  role: "admin" | "executive" | "branch_manager" | "assessor" | "branch_employee" | "support_agent" | "super_admin";
  forcePasswordChange: boolean;
  branchId?: string;
  companyId?: string;
  superAdminScope?: "all" | "food" | "medical";
  phone?: string;
  jobTitle?: string;
  directManagerId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = claims.claims.sub as string;

    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUserId);

    const isAdmin = userRoles?.some((r) => r.role === "admin");
    const isSuperAdmin = userRoles?.some((r) => r.role === "super_admin");
    if (!isAdmin && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, password, role, forcePasswordChange, branchId, companyId, superAdminScope, phone, jobTitle, directManagerId }: CreateUserRequest = await req.json();
    const emailNormalized = typeof email === "string" ? email.trim().toLowerCase() : "";
    const fullNameNormalized = typeof fullName === "string" ? fullName.trim() : "";
    const passwordNormalized = typeof password === "string" ? password.trim() : "";

    // Only super admins can create other super admins
    if (role === "super_admin" && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only super admins can create super admin accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tenant isolation: caller must administer the target companyId
    // (unless creating a super_admin, which is already restricted above).
    if (role !== "super_admin") {
      if (!companyId) {
        return new Response(
          JSON.stringify({ error: "companyId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!(await canAdministerCompany(supabaseAdmin, requestingUserId, companyId))) {
        return new Response(
          JSON.stringify({ error: "Forbidden: you do not administer this workspace" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!emailNormalized || !fullNameNormalized || !passwordNormalized || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (passwordNormalized.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pre-check: is this email already registered anywhere in the system?
    {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .ilike("email", emailNormalized)
        .maybeSingle();

      let existingUserId: string | null = existingProfile?.user_id ?? null;

      if (!existingUserId) {
        // Fallback: scan auth users (handles cases where a profile row wasn't created)
        try {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === emailNormalized);
          existingUserId = found?.id ?? null;
        } catch (_) {}
      }

      if (existingUserId) {
        let companies: { id: string; name: string }[] = [];
        const { data: cu } = await supabaseAdmin
          .from("company_users")
          .select("company_id, companies:company_id(id, name)")
          .eq("user_id", existingUserId);
        companies = (cu || [])
          .map((r: any) => r.companies)
          .filter(Boolean)
          .map((c: any) => ({ id: c.id, name: c.name }));

        const names = companies.map((c) => c.name).join("، ");
        const messageAr = companies.length
          ? `هذا البريد الإلكتروني مسجّل مسبقًا في: ${names}`
          : "هذا البريد الإلكتروني مسجّل مسبقًا في النظام";
        const messageEn = companies.length
          ? `This email is already registered in: ${names}`
          : "This email is already registered in the system";

        return new Response(
          JSON.stringify({
            error: messageAr,
            error_en: messageEn,
            code: "email_exists",
            existingUserId,
            companies,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNormalized,
      password: passwordNormalized,
      email_confirm: true,
      user_metadata: { full_name: fullNameNormalized },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      const msg = (createError.message || "").toLowerCase();
      const isDuplicate =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("user already exists") ||
        msg.includes("duplicate");
      if (isDuplicate) {
        // Look up existing user and their workspace memberships
        let existingUserId: string | null = null;
        try {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === emailNormalized);
          existingUserId = found?.id ?? null;
        } catch (_) {}

        let companies: { id: string; name: string }[] = [];
        if (existingUserId) {
          const { data: cu } = await supabaseAdmin
            .from("company_users")
            .select("company_id, companies:company_id(id, name)")
            .eq("user_id", existingUserId);
          companies = (cu || [])
            .map((r: any) => r.companies)
            .filter(Boolean)
            .map((c: any) => ({ id: c.id, name: c.name }));
        }

        const names = companies.map((c) => c.name).join("، ");
        const messageAr = companies.length
          ? `هذا البريد مسجّل مسبقًا في: ${names}`
          : "هذا البريد مسجّل مسبقًا في النظام (بدون انتماء لأي شركة)";
        const messageEn = companies.length
          ? `This email is already registered in: ${names}`
          : "This email is already registered in the system (no workspace membership)";

        return new Response(
          JSON.stringify({
            error: messageAr,
            error_en: messageEn,
            code: "email_exists",
            existingUserId,
            companies,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    const profileData: Record<string, unknown> = {
      user_id: newUser.user.id,
      email: emailNormalized,
      full_name: fullNameNormalized,
      force_password_change: forcePasswordChange ?? false,
    };
    if ((role === "branch_manager" || role === "branch_employee") && branchId) {
      profileData.branch_id = branchId;
    }
    if (phone) profileData.phone = phone;
    if (jobTitle) profileData.job_title = jobTitle;
    if (directManagerId) profileData.direct_manager_id = directManagerId;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert(profileData);

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role,
    });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // If super_admin, set scope
    if (role === "super_admin") {
      const { error: scopeError } = await supabaseAdmin.from("super_admin_scopes").insert({
        user_id: newUser.user.id,
        scope: superAdminScope || "all",
      });
      if (scopeError) {
        console.error("Error setting super admin scope:", scopeError);
      }
    }

    // If branch_manager, update the branch's manager_id
    if (role === "branch_manager" && branchId) {
      const { error: branchError } = await supabaseAdmin
        .from("branches")
        .update({ manager_id: newUser.user.id })
        .eq("id", branchId);

      if (branchError) {
        console.error("Error updating branch manager:", branchError);
      }
    }

    // Add user as a member of the target workspace (current company)
    if (companyId) {
      const companyMemberRole = role === "admin" ? "admin" : "member";
      const { error: membershipError } = await supabaseAdmin.from("company_users").insert({
        user_id: newUser.user.id,
        company_id: companyId,
        role: companyMemberRole,
        is_active: true,
      });
      if (membershipError) {
        console.error("Error adding workspace membership:", membershipError);
      }

      // Set default workspace on profile
      await supabaseAdmin
        .from("profiles")
        .update({ default_company_id: companyId })
        .eq("user_id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.user.id, email },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
