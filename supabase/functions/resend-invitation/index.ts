import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { generateTempPassword } from "../_shared/password.ts";
import { canAdministerUser } from "../_shared/tenant-admin.ts";

interface ResendInviteRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Create admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const isAdmin = userRoles?.some((r) => r.role === "admin");
    const isSuperAdmin = userRoles?.some((r) => r.role === "super_admin");
    if (!isAdmin && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can resend invitations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId }: ResendInviteRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block non-super-admins from resending credentials for a super admin.
    if (userId !== requestingUser.id) {
      const { data: targetRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const targetIsSuperAdmin = targetRoles?.some((r) => r.role === "super_admin");
      if (targetIsSuperAdmin && !isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Tenant isolation: caller must administer the target user's company.
    if (!(await canAdministerUser(supabaseAdmin, requestingUser.id, userId))) {
      return new Response(
        JSON.stringify({ error: "Forbidden: target user is not in your workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a new secure temporary password (~120 bits of entropy)
    const tempPassword = generateTempPassword();

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send invitation email if Resend is configured
    let emailSent = false;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const siteUrl = Deno.env.get("SITE_URL") || "https://your-app.lovable.app";
        
        await resend.emails.send({
          from: "SQCS <onboarding@resend.dev>",
          to: [profile.email],
          subject: "Your SQCS Account - New Login Credentials",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">SQCS Account Access</h1>
              <p>Hello ${profile.full_name},</p>
              <p>Your login credentials have been reset for the Smart Branch Quality Color System.</p>
              <p><strong>Your new login credentials:</strong></p>
              <ul>
                <li>Email: ${profile.email}</li>
                <li>Temporary Password: ${tempPassword}</li>
              </ul>
              <p>Please login and change your password immediately.</p>
              <p><a href="${siteUrl}/auth" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to SQCS</a></p>
              <p style="color: #666; font-size: 12px;">If you didn't expect this email, please contact your administrator.</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        tempPassword: emailSent ? undefined : tempPassword,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in resend-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
