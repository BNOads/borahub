import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Base64 URL encode
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Create JWT for Google Service Account authentication
async function createServiceAccountJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const headerEncoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const claimsEncoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const signatureInput = `${headerEncoded}.${claimsEncoded}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = base64UrlEncode(new Uint8Array(signature));
  return `${signatureInput}.${signatureEncoded}`;
}

// Exchange JWT for access token
async function getAccessToken(jwt: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token exchange error:", error);
    throw new Error(`Failed to get access token: ${error}`);
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

    // Get service account credentials
    const serviceAccountKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountKeyRaw) {
      return new Response(
        JSON.stringify({ error: "Google Service Account not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount;
    try {
      // Try parsing directly first
      serviceAccount = JSON.parse(serviceAccountKeyRaw);
    } catch (e1) {
      // If it fails, try cleaning up the string (handle escaped newlines, etc.)
      try {
        // Replace escaped newlines with actual newlines in the private_key field
        const cleaned = serviceAccountKeyRaw
          .replace(/\\\\n/g, "\\n") // Fix double-escaped newlines
          .trim();
        serviceAccount = JSON.parse(cleaned);
      } catch (e2) {
        console.error("JSON parse error:", e1, e2);
        console.error("Raw key preview:", serviceAccountKeyRaw.substring(0, 100) + "...");
        return new Response(
          JSON.stringify({ 
            error: "Invalid service account JSON format",
            hint: "Certifique-se de colar o JSON completo da Service Account (arquivo .json baixado do Google Cloud)"
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate required fields
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error("Missing required fields. Has client_email:", !!serviceAccount.client_email, "Has private_key:", !!serviceAccount.private_key);
      return new Response(
        JSON.stringify({ 
          error: "Service account JSON missing required fields",
          hint: "O JSON deve conter 'client_email' e 'private_key'"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create JWT and get access token
    console.log("Creating JWT for authentication...");
    const jwt = await createServiceAccountJWT(serviceAccount);
    const accessToken = await getAccessToken(jwt);
    console.log("Successfully authenticated with Google");

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
        details: "Verifique se o arquivo está compartilhado com a Service Account"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
