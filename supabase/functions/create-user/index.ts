import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  display_name?: string;
  department?: string;
  job_title?: string;
  role: "admin" | "collaborator";
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
      throw new Error("Unauthorized: Only admins can create users");
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, full_name, display_name, department, job_title, role } = body;

    if (!email || !full_name) {
      throw new Error("Email and full_name are required");
    }

    // Generate initial password from email
    const initialPassword = email.split("@")[0];

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create the user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        display_name: display_name || full_name,
      },
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Failed to create user: No user returned");
    }

    // Try to create or update the profile manually (in case trigger didn't work)
    const { error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: email,
        full_name,
        display_name: display_name || full_name,
        department: department || null,
        job_title: job_title || null,
        role,
        must_change_password: true,
        is_active: true,
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error("Failed to upsert profile:", upsertError);
      // Don't throw - user was created, profile might exist from trigger
    }

    // Log the activity (ignore errors)
    try {
      await supabaseAdmin
        .from("activity_logs")
        .insert({
          user_id: user.id, // admin who created the user
          action: "user_created",
          entity_type: "user",
          entity_id: authData.user.id,
        });
    } catch (logError) {
      console.error("Failed to log activity:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        initial_password: initialPassword,
        message: "User created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
