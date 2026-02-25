import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: sessions, error } = await supabase
      .from("strategic_sessions")
      .select("id, name, google_sheet_url")
      .not("google_sheet_url", "is", null);

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: "No sessions to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const session of sessions) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/sync-strategic-leads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ session_id: session.id }),
        });

        const data = await res.json();
        
        // Log the sync result
        await supabase.from("strategic_sync_logs").insert({
          session_id: session.id,
          session_name: session.name,
          status: "ok",
          total_rows: data.total_rows || data.totalRows || 0,
          duplicates_removed: data.duplicates_removed || data.duplicatesRemoved || 0,
          source: "cron",
        });

        results.push({ session: session.name, status: "ok", ...data });
        console.log(`Synced session "${session.name}": ${JSON.stringify(data)}`);
      } catch (err: any) {
        // Log the error
        await supabase.from("strategic_sync_logs").insert({
          session_id: session.id,
          session_name: session.name,
          status: "error",
          error_message: err.message,
          source: "cron",
        });

        results.push({ session: session.name, status: "error", error: err.message });
        console.error(`Error syncing "${session.name}":`, err.message);
      }
    }

    return new Response(JSON.stringify({ synced: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Cron sync error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
