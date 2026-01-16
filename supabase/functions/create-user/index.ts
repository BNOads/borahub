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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Missing env vars:", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
        hasService: !!supabaseServiceKey
      });
      throw new Error("Server configuration error: Missing environment variables");
    }

    // Client with user token to get the user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the requester's token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError) {
      console.error("User error:", userError);
      throw new Error(`Unauthorized: ${userError.message}`);
    }
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }

    console.log("User authenticated:", user.id, user.email);

    // Create admin client to bypass RLS when checking profile
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Use admin client to check profile (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, is_active, email")
      .eq("id", user.id)
      .single();

    console.log("Profile query result:", { profile, profileError });

    if (profileError) {
      console.error("Profile error:", profileError);
      throw new Error(`Profile not found: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error("Profile not found for user: " + user.email);
    }

    if (profile.role !== "admin") {
      throw new Error(`Unauthorized: User ${profile.email} is not an admin (role: ${profile.role})`);
    }

    if (!profile.is_active) {
      throw new Error(`Unauthorized: User ${profile.email} is inactive`);
    }

    console.log("Admin verified:", profile.email);

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, full_name, display_name, department, job_title, role } = body;

    if (!email || !full_name) {
      throw new Error("Email and full_name are required");
    }

    // Generate initial password from email
    const initialPassword = email.split("@")[0];

    // Create the user (supabaseAdmin already created above)
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
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
