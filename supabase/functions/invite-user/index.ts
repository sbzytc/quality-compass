import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  fullName: string;
  role: "admin" | "executive" | "branch_manager" | "assessor";
  branchId?: string;
  regionId?: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;
    
    // Check if user has admin role
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = userRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, role, branchId, regionId }: InviteRequest = await req.json();

    // Validate required fields
    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, fullName, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";

    // Create user with Supabase Admin
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: newUser.user.id,
      email,
      full_name: fullName,
      branch_id: branchId || null,
      region_id: regionId || null,
    });

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

    // Send invitation email if Resend is configured
    let emailSent = false;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const siteUrl = Deno.env.get("SITE_URL") || "https://your-app.lovable.app";
        
        await resend.emails.send({
          from: "SQCS <noreply@yourdomain.com>",
          to: [email],
          subject: "Welcome to SQCS - Your Account Has Been Created",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Welcome to SQCS</h1>
              <p>Hello ${fullName},</p>
              <p>Your account has been created for the Smart Branch Quality Color System.</p>
              <p><strong>Your login credentials:</strong></p>
              <ul>
                <li>Email: ${email}</li>
                <li>Temporary Password: ${tempPassword}</li>
              </ul>
              <p>Please login and change your password immediately.</p>
              <p><a href="${siteUrl}/auth" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to SQCS</a></p>
              <p style="color: #666; font-size: 12px;">If you didn't expect this email, please ignore it.</p>
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
        user: { id: newUser.user.id, email },
        emailSent,
        tempPassword: emailSent ? undefined : tempPassword, // Only return password if email wasn't sent
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
