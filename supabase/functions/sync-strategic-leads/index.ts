import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current);
        current = "";
        if (row.some(c => c.trim() !== "")) rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    if (row.some(c => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { session_id } = body;
    if (!session_id) throw new Error("session_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from("strategic_sessions")
      .select("*")
      .eq("id", session_id)
      .single();
    if (sessionError || !session) throw new Error("Session not found");
    if (!session.google_sheet_url) throw new Error("No Google Sheet URL configured");

    // Extract spreadsheet ID
    const sheetMatch = session.google_sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetMatch) throw new Error("Invalid Google Sheet URL");
    const spreadsheetId = sheetMatch[1];

    // Fetch public CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
    console.log("Fetching public CSV:", csvUrl);

    const csvResponse = await fetch(csvUrl, { redirect: "follow" });
    if (!csvResponse.ok) {
      const errText = await csvResponse.text();
      throw new Error(`Failed to fetch Google Sheet (${csvResponse.status}). Make sure the sheet is shared publicly ("Anyone with the link can view"). Details: ${errText.substring(0, 200)}`);
    }

    const csvText = await csvResponse.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return new Response(JSON.stringify({ created: 0, updated: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rows[0].map((h: string) => h.toLowerCase().trim());

    // Get qualification criteria
    const { data: criteria = [] } = await supabase
      .from("strategic_qualification_criteria")
      .select("*")
      .eq("session_id", session_id);

    let created = 0, updated = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { rowData[h] = row[idx] || ""; });

      const sourceRowId = `${spreadsheetId}_row_${i}`;
      const name = rowData["nome"] || rowData["name"] || rowData["lead"] || `Lead ${i}`;
      const email = rowData["email"] || rowData["e-mail"] || null;
      const phone = rowData["telefone"] || rowData["phone"] || rowData["whatsapp"] || null;
      const utmSource = rowData["utm_source"] || rowData["fonte"] || null;
      const utmMedium = rowData["utm_medium"] || null;
      const utmCampaign = rowData["utm_campaign"] || rowData["campanha"] || null;
      const utmContent = rowData["utm_content"] || null;

      // Qualification
      let score = 0;
      let totalWeight = 0;
      for (const c of (criteria || [])) {
        totalWeight += Number(c.weight);
        const fieldValue = rowData[c.field_name.toLowerCase()] || "";
        let match = false;
        switch (c.operator) {
          case "equals": match = fieldValue.toLowerCase() === c.value.toLowerCase(); break;
          case "contains": match = fieldValue.toLowerCase().includes(c.value.toLowerCase()); break;
          case "greater_than": match = parseFloat(fieldValue) > parseFloat(c.value); break;
          case "less_than": match = parseFloat(fieldValue) < parseFloat(c.value); break;
          case "not_empty": match = fieldValue.trim() !== ""; break;
        }
        if (match) score += Number(c.weight);
      }
      const isQualified = totalWeight > 0 ? (score / totalWeight) >= 0.5 : false;

      const leadData = {
        session_id,
        name,
        email,
        phone,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        is_qualified: isQualified,
        qualification_score: totalWeight > 0 ? Math.round((score / totalWeight) * 100) : null,
        extra_data: rowData,
        source_row_id: sourceRowId,
      };

      const { data: existing } = await supabase
        .from("strategic_leads")
        .select("id")
        .eq("source_row_id", sourceRowId)
        .eq("session_id", session_id)
        .maybeSingle();

      if (existing) {
        await supabase.from("strategic_leads").update(leadData).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("strategic_leads").insert(leadData);
        created++;
      }
    }

    console.log(`Sync complete: ${created} created, ${updated} updated, ${rows.length - 1} total rows`);

    return new Response(JSON.stringify({ created, updated, total: rows.length - 1 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Sync error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
