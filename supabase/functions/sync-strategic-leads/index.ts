import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from("strategic_sessions")
      .select("*")
      .eq("id", session_id)
      .single();
    if (sessionError || !session) throw new Error("Session not found");
    if (!session.google_sheet_url) throw new Error("No Google Sheet URL configured");

    // Extract spreadsheet ID from URL
    const sheetMatch = session.google_sheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetMatch) throw new Error("Invalid Google Sheet URL");
    const spreadsheetId = sheetMatch[1];

    // Get Google access token
    const serviceAccountKey = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") || "{}");
    const token = await getGoogleAccessToken(serviceAccountKey);

    // Fetch sheet data
    const sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!sheetResponse.ok) throw new Error(`Google Sheets API error: ${sheetResponse.status}`);
    const sheetData = await sheetResponse.json();

    const rows = sheetData.values || [];
    if (rows.length < 2) return new Response(JSON.stringify({ created: 0, updated: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

      // Upsert
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

    return new Response(JSON.stringify({ created, updated, total: rows.length - 1 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const signInput = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signInput));
  const jwt = `${signInput}.${arrayBufferToBase64Url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(b64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
