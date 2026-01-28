import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get access token using OAuth refresh token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google OAuth credentials not configured (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token refresh error:", error);
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get file metadata from Google Drive
async function getFileMetadata(fileId: string, accessToken: string): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("File metadata error:", error);
    throw new Error(`Failed to get file metadata: ${error}`);
  }

  return response.json();
}

// Download file from Google Drive
async function downloadFile(fileId: string, accessToken: string): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("File download error:", error);
    throw new Error(`Failed to download file: ${error}`);
  }

  return response.arrayBuffer();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "fileId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing download for file: ${fileId}`);

    // Get access token using OAuth refresh flow
    console.log("Getting access token via OAuth refresh...");
    const accessToken = await getAccessToken();
    console.log("Successfully authenticated with Google OAuth");

    // Get file metadata
    console.log("Fetching file metadata...");
    const metadata = await getFileMetadata(fileId, accessToken);
    console.log(`File: ${metadata.name}, Size: ${metadata.size} bytes, Type: ${metadata.mimeType}`);

    // Check file size (limit to 50MB for edge function memory)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (parseInt(metadata.size) > MAX_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: "File too large",
          message: "O arquivo excede o limite de 50MB para download via API. Por favor, faça o download manualmente.",
          metadata 
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the file
    console.log("Downloading file...");
    const fileData = await downloadFile(fileId, accessToken);
    console.log(`Downloaded ${fileData.byteLength} bytes`);

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileData)));

    return new Response(
      JSON.stringify({
        success: true,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
        },
        data: base64,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Verifique se as credenciais OAuth estão corretas e se o refresh token é válido"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
