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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Missing env vars:", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
        hasService: !!supabaseServiceKey
      });
      throw new Error("Server configuration error: Missing environment variables");
    }

    // Create client with user's auth header to validate token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the JWT token using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Claims error:", claimsError);
      throw new Error("Unauthorized: Invalid token");
    }

    const userId = claimsData.claims.sub;
    console.log("User authenticated via claims:", userId);

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user is admin using admin client
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError) {
      console.error("Role error:", roleError);
      throw new Error("Failed to verify user role");
    }

    if (roleData?.role !== "admin") {
      throw new Error(`Unauthorized: User is not an admin (role: ${roleData?.role})`);
    }

    // Verify user is active
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_active, email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      throw new Error("Profile not found");
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

    console.log("User created:", authData.user.id);

    // Create or update the profile
    const { error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: email,
        full_name,
        display_name: display_name || full_name,
        department_id: department || null,
        job_title: job_title || null,
        must_change_password: true,
        is_active: true,
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error("Failed to upsert profile:", upsertError);
    }

    // Assign role in user_roles table
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: authData.user.id,
        role: role,
      }, {
        onConflict: 'user_id'
      });

    if (roleInsertError) {
      console.error("Failed to insert role:", roleInsertError);
    }

    // Log the activity
    try {
      await supabaseAdmin
        .from("activity_logs")
        .insert({
          user_id: userId,
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
