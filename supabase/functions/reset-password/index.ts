import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify the requester
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with the user's token to verify they're admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user token to verify admin status
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the requester is an admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }

    const { data: profile, error: profileError } = await supabaseUser
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Unauthorized: Profile not found");
    }

    if (profile.role !== "admin" || !profile.is_active) {
      throw new Error("Unauthorized: Only admins can reset passwords");
    }

    // Parse request body
    const body: ResetPasswordRequest = await req.json();
    const { user_id } = body;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the user's email to generate new password
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", user_id)
      .single();

    if (targetProfileError || !targetProfile) {
      throw new Error("User not found");
    }

    // Generate new password from email
    const newPassword = targetProfile.email.split("@")[0];

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Failed to reset password: ${updateError.message}`);
    }

    // Mark that user must change password
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", user_id);

    if (profileUpdateError) {
      console.error("Failed to update must_change_password:", profileUpdateError);
    }

    // Log the activity (ignore errors)
    try {
      await supabaseAdmin
        .from("activity_logs")
        .insert({
          user_id: user.id, // admin who reset the password
          action: "password_reset",
          entity_type: "user",
          entity_id: user_id,
        });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_password: newPassword,
        message: "Password reset successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
