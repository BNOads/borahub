import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLING_API_BASE = "https://www.bling.com.br/Api/v3";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Get valid Bling access token, refreshing if needed
async function getBlingAccessToken(supabase: any): Promise<string> {
  const { data: tokens, error } = await supabase
    .from("bling_oauth_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !tokens) {
    throw new Error("Nenhum token Bling configurado. Faça a autenticação OAuth primeiro.");
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    return tokens.access_token;
  }

  // Refresh the token
  console.log("Refreshing Bling access token...");
  const clientId = Deno.env.get("BLING_CLIENT_ID")!;
  const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const refreshResponse = await fetch(`${BLING_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    const errText = await refreshResponse.text();
    console.error("Bling token refresh failed:", errText);
    throw new Error(`Falha ao renovar token Bling: ${errText}`);
  }

  const newTokens = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + (newTokens.expires_in || 21600) * 1000);

  // Update stored tokens
  await supabase
    .from("bling_oauth_tokens")
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq("id", tokens.id);

  console.log("Bling token refreshed successfully");
  return newTokens.access_token;
}

// Exchange authorization code for tokens
async function handleOAuthCallback(code: string, supabase: any) {
  const clientId = Deno.env.get("BLING_CLIENT_ID")!;
  const clientSecret = Deno.env.get("BLING_CLIENT_SECRET")!;
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${BLING_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao trocar código OAuth: ${errText}`);
  }

  const tokenData = await response.json();
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 21600) * 1000);

  // Delete old tokens and store new ones
  await supabase.from("bling_oauth_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { error } = await supabase.from("bling_oauth_tokens").insert({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error(`Erro ao salvar tokens: ${error.message}`);

  return { success: true, expires_at: expiresAt.toISOString() };
}

// Get OAuth authorize URL
function getAuthorizeUrl(redirectUri?: string) {
  const clientId = Deno.env.get("BLING_CLIENT_ID")!;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    state: "bling_auth",
  });
  if (redirectUri) params.set("redirect_uri", redirectUri);
  return `${BLING_API_BASE}/oauth/authorize?${params.toString()}`;
}

// Check Bling connection status
async function checkConnectionStatus(supabase: any) {
  try {
    const { data: tokens, error } = await supabase
      .from("bling_oauth_tokens")
      .select("expires_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !tokens) {
      return { connected: false, error: "Nenhum token encontrado" };
    }

    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    return { connected: expiresAt > now, expires_at: tokens.expires_at };
  } catch (e: any) {
    return { connected: false, error: e.message };
  }
}

// Create order in Bling
async function createBlingOrder(shipment: any, token: string) {
  const address = shipment.buyer_address || {};
  
  const orderPayload = {
    numero: 0, // Bling auto-generates
    data: new Date(shipment.sale_date || Date.now()).toISOString().split("T")[0],
    contato: {
      nome: shipment.buyer_name,
      tipoPessoa: "F",
      numeroDocumento: shipment.buyer_document || "",
      telefone: shipment.buyer_phone || "",
      email: shipment.buyer_email || "",
      endereco: {
        endereco: address.street || address.address || "",
        numero: address.number || "",
        complemento: address.complement || "",
        bairro: address.neighborhood || "",
        cep: address.zipcode || address.zip || "",
        municipio: address.city || "",
        uf: address.state || "",
      },
    },
    itens: [
      {
        descricao: shipment.product_name,
        quantidade: 1,
        valor: shipment.sale_value || 0,
      },
    ],
    transporte: {
      fretePorConta: 0, // remetente
    },
  };

  const response = await fetch(`${BLING_API_BASE}/pedidos/vendas`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Erro ao criar pedido Bling: ${JSON.stringify(data)}`);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { action, ...params } = await req.json();

    let result: any;

    switch (action) {
      case "get_authorize_url":
        result = { url: getAuthorizeUrl(params.redirect_uri) };
        break;

      case "oauth_callback":
        if (!params.code) throw new Error("Código de autorização não fornecido");
        result = await handleOAuthCallback(params.code, supabase);
        break;

      case "check_connection":
        result = await checkConnectionStatus(supabase);
        break;

      case "create_order": {
        const token = await getBlingAccessToken(supabase);
        if (!params.shipment_id) throw new Error("shipment_id é obrigatório");
        
        const { data: shipment, error } = await supabase
          .from("book_shipments")
          .select("*")
          .eq("id", params.shipment_id)
          .single();
        
        if (error || !shipment) throw new Error("Envio não encontrado");
        
        const orderData = await createBlingOrder(shipment, token);
        const blingOrderId = orderData?.data?.id?.toString() || orderData?.data?.numero?.toString();
        
        // Update shipment
        await supabase
          .from("book_shipments")
          .update({
            stage: "pedido_bling",
            bling_order_id: blingOrderId,
            bling_created_at: new Date().toISOString(),
          })
          .eq("id", params.shipment_id);

        // Log history
        await supabase.from("book_shipment_history").insert({
          shipment_id: params.shipment_id,
          from_stage: "venda",
          to_stage: "pedido_bling",
          notes: `Pedido Bling criado: ${blingOrderId}`,
        });
        
        result = { success: true, bling_order_id: blingOrderId };
        break;
      }

      case "update_stage": {
        if (!params.shipment_id || !params.new_stage) throw new Error("shipment_id e new_stage são obrigatórios");
        
        const { data: current } = await supabase
          .from("book_shipments")
          .select("stage")
          .eq("id", params.shipment_id)
          .single();
        
        const updateData: any = { stage: params.new_stage };
        if (params.tracking_code) updateData.tracking_code = params.tracking_code;
        if (params.label_url) updateData.label_url = params.label_url;
        if (params.new_stage === "enviado") updateData.shipped_at = new Date().toISOString();
        if (params.new_stage === "entregue") updateData.delivered_at = new Date().toISOString();
        if (params.new_stage === "etiqueta") updateData.label_generated_at = new Date().toISOString();
        
        await supabase
          .from("book_shipments")
          .update(updateData)
          .eq("id", params.shipment_id);

        await supabase.from("book_shipment_history").insert({
          shipment_id: params.shipment_id,
          from_stage: current?.stage || "unknown",
          to_stage: params.new_stage,
          notes: params.notes || null,
        });
        
        result = { success: true };
        break;
      }

      case "auto_process_book_sales": {
        // Fetch active aliases
        const { data: aliases } = await supabase
          .from("book_product_aliases")
          .select("alias")
          .eq("is_active", true);

        const aliasList = (aliases || []).map((a: any) => a.alias.toLowerCase());
        if (aliasList.length === 0) {
          result = { success: true, message: "Nenhum alias ativo configurado", processed: 0 };
          break;
        }

        console.log("Active book aliases:", aliasList);

        // Fetch paid sales from March 1, 2025 onwards
        const cutoffDate = "2025-03-01";
        const { data: sales, error: salesErr } = await supabase
          .from("sales")
          .select("id, external_id, client_name, client_email, client_phone, product_name, total_value, sale_date")
          .eq("status", "active")
          .gte("sale_date", cutoffDate)
          .order("sale_date", { ascending: false });

        if (salesErr) throw salesErr;

        // Filter sales that match book aliases
        const bookSales = (sales || []).filter((s: any) => {
          const name = (s.product_name || "").toLowerCase();
          return aliasList.some((alias: string) => name.includes(alias));
        });

        console.log(`Found ${bookSales.length} book sales from ${cutoffDate}`);

        let shipmentsCreated = 0;
        let blingOrdersCreated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const sale of bookSales) {
          try {
            // Check if shipment already exists for this sale
            const { data: existing } = await supabase
              .from("book_shipments")
              .select("id, stage")
              .or(`sale_id.eq.${sale.id},external_id.eq.${sale.external_id}`)
              .limit(1)
              .maybeSingle();

            if (existing) {
              skipped++;
              continue;
            }

            // Create book_shipment
            const { data: newShipment, error: insertErr } = await supabase
              .from("book_shipments")
              .insert({
                sale_id: sale.id,
                external_id: sale.external_id,
                product_name: sale.product_name,
                buyer_name: sale.client_name,
                buyer_email: sale.client_email,
                buyer_phone: sale.client_phone,
                sale_date: sale.sale_date,
                sale_value: sale.total_value,
                stage: "venda",
              })
              .select("id")
              .single();

            if (insertErr) {
              errors.push(`Shipment ${sale.external_id}: ${insertErr.message}`);
              continue;
            }

            shipmentsCreated++;
            console.log(`Created shipment for sale ${sale.external_id}`);

            // Auto-create Bling order
            try {
              const token = await getBlingAccessToken(supabase);
              const shipmentForBling = {
                buyer_name: sale.client_name,
                buyer_email: sale.client_email,
                buyer_phone: sale.client_phone,
                product_name: sale.product_name,
                sale_date: sale.sale_date,
                sale_value: sale.total_value,
                buyer_address: {},
              };

              const orderData = await createBlingOrder(shipmentForBling, token);
              const blingOrderId = orderData?.data?.id?.toString() || orderData?.data?.numero?.toString();

              await supabase
                .from("book_shipments")
                .update({
                  stage: "pedido_bling",
                  bling_order_id: blingOrderId,
                  bling_created_at: new Date().toISOString(),
                })
                .eq("id", newShipment.id);

              await supabase.from("book_shipment_history").insert({
                shipment_id: newShipment.id,
                from_stage: "venda",
                to_stage: "pedido_bling",
                notes: `Pedido Bling criado automaticamente: ${blingOrderId}`,
              });

              blingOrdersCreated++;
              console.log(`Created Bling order ${blingOrderId} for ${sale.external_id}`);
            } catch (blingErr: any) {
              console.error(`Bling order failed for ${sale.external_id}:`, blingErr.message);
              errors.push(`Bling ${sale.external_id}: ${blingErr.message}`);
              // Shipment stays at "venda" stage - can be retried
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 200));
          } catch (err: any) {
            errors.push(`${sale.external_id}: ${err.message}`);
          }
        }

        result = {
          success: true,
          total_book_sales: bookSales.length,
          shipments_created: shipmentsCreated,
          bling_orders_created: blingOrdersCreated,
          skipped,
          errors: errors.slice(0, 10),
        };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("bling-sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
