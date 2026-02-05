import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportPayload {
  funnel_id: string;
  funnel_name: string;
  report_date: string;
  contacts: number;
  followups: number;
  reschedules: number;
  meetings_scheduled: number;
  meetings_held: number;
  no_shows: number;
  sales: number;
  summary: string;
  reported_by: string;
  reported_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: ReportPayload = await req.json();
    console.log("Received daily report:", payload);

    // Get webhook URL from environment
    const webhookUrl = Deno.env.get("FUNNEL_REPORT_WEBHOOK_URL");
    
    if (!webhookUrl) {
      console.log("No webhook URL configured, skipping external notification");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Report received but no webhook configured" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Send to external webhook
    console.log("Sending to webhook:", webhookUrl);
    
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Webhook returned error:", webhookResponse.status, errorText);
      // Don't throw - webhook failure shouldn't fail the whole operation
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Report saved but webhook notification failed",
          webhook_error: `${webhookResponse.status}: ${errorText}`
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    console.log("Webhook sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Report sent to webhook" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in funnel-daily-report-webhook:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
