import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { generateTempPassword } from "../_shared/password.ts";
import { canAdministerUser } from "../_shared/tenant-admin.ts";

interface ResetPasswordRequest {
  userId: string;
  email: string;
  customPassword?: string;
}

const MAX_GENERATED_PASSWORD_ATTEMPTS = 5;

function isWeakPasswordError(error: { message?: string } | null): boolean {
  const message = (error?.message || "").toLowerCase();
  return message.includes("known to be weak") || message.includes("easy to guess") || message.includes("password") && message.includes("weak");
}

function weakPasswordResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "تم رفض كلمة المرور من إعدادات المصادقة. استخدم كلمة مرور من 6 خانات أو أكثر.",
      error_en: "The password was rejected by auth settings. Use a password with 6 or more characters.",
      code: "weak_password",
    }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

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
        JSON.stringify({ error: "Only admins can reset passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, email, customPassword }: ResetPasswordRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block non-super-admins from resetting a super admin's password.
    if (userId !== requestingUserId) {
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

    // Tenant isolation: caller must administer the target user's company
    // (or be a super_admin, or act on themselves).
    if (!(await canAdministerUser(supabaseAdmin, requestingUserId, userId))) {
      return new Response(
        JSON.stringify({ error: "Forbidden: target user is not in your workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let newPassword = customPassword || generateTempPassword();
    let updateError: { message?: string } | null = null;

    if (customPassword) {
      const result = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      updateError = result.error;
    } else {
      for (let attempt = 1; attempt <= MAX_GENERATED_PASSWORD_ATTEMPTS; attempt++) {
        newPassword = generateTempPassword();
        const result = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });
        updateError = result.error;
        if (!updateError) break;
        if (!isWeakPasswordError(updateError)) break;
      }
    }

    if (updateError) {
      console.error("Error updating password:", updateError);
      if (isWeakPasswordError(updateError)) return weakPasswordResponse(corsHeaders);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: forceChangeError } = await supabaseAdmin
      .from("profiles")
      .update({ force_password_change: true })
      .eq("user_id", userId);

    if (forceChangeError) {
      console.error("Error marking password change as required:", forceChangeError);
      return new Response(
        JSON.stringify({ error: forceChangeError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send password reset email if Resend is configured
    let emailSent = false;
    const shouldSendEmail = !customPassword; // Only send email for auto-generated passwords
    if (resendApiKey && shouldSendEmail) {
      try {
        const resend = new Resend(resendApiKey);
        const siteUrl = Deno.env.get("SITE_URL") || "https://your-app.lovable.app";
        
        await resend.emails.send({
          from: "SQCS <noreply@yourdomain.com>",
          to: [email],
          subject: "SQCS - Your Password Has Been Reset",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Password Reset</h1>
              <p>Your password has been reset by an administrator.</p>
              <p><strong>Your new temporary password:</strong> ${newPassword}</p>
              <p>Please login and change your password immediately.</p>
              <p><a href="${siteUrl}/auth" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to SQCS</a></p>
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
        tempPassword: customPassword ? undefined : (emailSent ? undefined : newPassword),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in reset-user-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
