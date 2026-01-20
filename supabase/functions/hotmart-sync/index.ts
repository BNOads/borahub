import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HotmartToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface HotmartProduct {
  id: number;
  name: string;
  ucode: string;
  status: string;
}

interface HotmartSale {
  transaction: string;
  product: {
    id: number;
    name: string;
    ucode: string;
  };
  buyer: {
    name: string;
    email: string;
    phone?: string;
  };
  purchase: {
    approved_date?: number;
    status: string;
    price: {
      value: number;
      currency_code: string;
    };
    payment: {
      type: string;
      installments_number: number;
    };
    recurrency_number?: number;
  };
  producer?: {
    name: string;
  };
  affiliates?: Array<{
    affiliate_code: string;
    name: string;
  }>;
}

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 minutes buffer)
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    console.log("Using cached token");
    return cachedToken.token;
  }

  console.log("Fetching new access token from Hotmart");
  
  const clientId = Deno.env.get("HOTMART_CLIENT_ID");
  const clientSecret = Deno.env.get("HOTMART_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("HOTMART_CLIENT_ID or HOTMART_CLIENT_SECRET not configured");
  }

  // Create Basic auth header from client credentials
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch("https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token fetch error:", response.status, errorText);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data: HotmartToken = await response.json();
  
  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  
  console.log("Access token obtained successfully");
  return data.access_token;
}

async function fetchProducts(accessToken: string): Promise<HotmartProduct[]> {
  console.log("Fetching products from Hotmart");
  
  const allProducts: HotmartProduct[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `https://developers.hotmart.com/products/api/v1/products?page_token=${page}&max_results=50`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Products fetch error:", response.status, errorText);
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    const data = await response.json();
    const products = data.items || [];
    allProducts.push(...products);
    
    // Check if there's a next page
    hasMore = data.page_info?.next_page_token ? true : false;
    page++;
    
    // Rate limiting: wait 100ms between requests
    if (hasMore) await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`Fetched ${allProducts.length} products`);
  return allProducts;
}

async function fetchSalesHistory(
  accessToken: string,
  startDate: Date,
  endDate: Date,
  status?: string
): Promise<HotmartSale[]> {
  console.log("Fetching sales history from Hotmart");
  
  const allSales: HotmartSale[] = [];
  let page = 0;
  let hasMore = true;
  
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();
  
  while (hasMore) {
    let url = `https://developers.hotmart.com/payments/api/v1/sales/history?start_date=${startTimestamp}&end_date=${endTimestamp}&page=${page}&rows=50`;
    if (status) {
      url += `&transaction_status=${status}`;
    }
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sales fetch error:", response.status, errorText);
      throw new Error(`Failed to fetch sales: ${response.status}`);
    }

    const data = await response.json();
    const sales = data.items || [];
    allSales.push(...sales);
    
    hasMore = sales.length === 50;
    page++;
    
    // Rate limiting: wait 100ms between requests
    if (hasMore) await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`Fetched ${allSales.length} sales`);
  return allSales;
}

async function fetchSaleSummary(accessToken: string, transactionId: string): Promise<any> {
  const response = await fetch(
    `https://developers.hotmart.com/payments/api/v1/sales/summary?transaction=${transactionId}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Sale summary fetch error:", response.status, errorText);
    throw new Error(`Failed to fetch sale summary: ${response.status}`);
  }

  return response.json();
}

function mapHotmartStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "APPROVED": "paid",
    "COMPLETED": "paid",
    "CANCELED": "cancelled",
    "REFUNDED": "refunded",
    "CHARGEBACK": "chargeback",
    "WAITING_PAYMENT": "pending",
    "PENDING": "pending",
    "EXPIRED": "overdue",
    "DELAYED": "overdue",
    "PRINTED_BILLET": "pending",
    "BILLET_PRINTED": "pending",
    "PROTEST": "overdue",
  };
  return statusMap[status] || "pending";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, startDate, endDate, status, transactionId, sellerId } = await req.json();
    
    console.log(`Hotmart sync action: ${action}`);
    
    const accessToken = await getAccessToken();
    
    switch (action) {
      case "get_products": {
        const products = await fetchProducts(accessToken);
        return new Response(JSON.stringify({ success: true, products }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "get_sales": {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const sales = await fetchSalesHistory(accessToken, start, end, status);
        return new Response(JSON.stringify({ success: true, sales }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "get_sale_summary": {
        if (!transactionId) {
          throw new Error("transactionId is required");
        }
        const summary = await fetchSaleSummary(accessToken, transactionId);
        return new Response(JSON.stringify({ success: true, summary }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "sync_sales": {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const sales = await fetchSalesHistory(accessToken, start, end);
        
        let created = 0;
        let updated = 0;
        let failed = 0;
        const errors: string[] = [];
        
        for (const sale of sales) {
          try {
            const saleData = {
              external_id: sale.transaction,
              client_name: sale.buyer.name,
              client_email: sale.buyer.email,
              client_phone: sale.buyer.phone || null,
              product_name: sale.product.name,
              total_value: sale.purchase.price.value,
              installments_count: sale.purchase.payment.installments_number || 1,
              platform: "hotmart",
              commission_percent: 0, // Will be set based on product config
              sale_date: sale.purchase.approved_date 
                ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              status: mapHotmartStatus(sale.purchase.status) === "paid" ? "active" : "cancelled",
              seller_id: sellerId || null,
            };
            
            // Check if sale already exists
            const { data: existingSale } = await supabase
              .from("sales")
              .select("id")
              .eq("external_id", sale.transaction)
              .single();
            
            if (existingSale) {
              // Update existing sale
              const { error } = await supabase
                .from("sales")
                .update(saleData)
                .eq("id", existingSale.id);
              
              if (error) throw error;
              updated++;
              
              // Update installments
              const installmentValue = saleData.total_value / saleData.installments_count;
              for (let i = 1; i <= saleData.installments_count; i++) {
                const recurrencyNumber = sale.purchase.recurrency_number || 0;
                const installmentStatus = i <= recurrencyNumber 
                  ? mapHotmartStatus(sale.purchase.status)
                  : "pending";
                
                const { error: installmentError } = await supabase
                  .from("installments")
                  .upsert({
                    sale_id: existingSale.id,
                    installment_number: i,
                    total_installments: saleData.installments_count,
                    value: installmentValue,
                    due_date: new Date(
                      new Date(saleData.sale_date).getTime() + (i - 1) * 30 * 24 * 60 * 60 * 1000
                    ).toISOString().split('T')[0],
                    status: installmentStatus,
                    payment_date: installmentStatus === "paid" && sale.purchase.approved_date
                      ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                      : null,
                  }, {
                    onConflict: "sale_id,installment_number",
                  });
                
                if (installmentError) {
                  console.error("Installment update error:", installmentError);
                }
              }
            } else {
              // Create new sale
              const { data: newSale, error } = await supabase
                .from("sales")
                .insert(saleData)
                .select("id")
                .single();
              
              if (error) throw error;
              created++;
              
              // Create installments
              const installmentValue = saleData.total_value / saleData.installments_count;
              const installments = [];
              for (let i = 1; i <= saleData.installments_count; i++) {
                const recurrencyNumber = sale.purchase.recurrency_number || 0;
                const installmentStatus = i <= recurrencyNumber 
                  ? mapHotmartStatus(sale.purchase.status)
                  : "pending";
                
                installments.push({
                  sale_id: newSale.id,
                  installment_number: i,
                  total_installments: saleData.installments_count,
                  value: installmentValue,
                  due_date: new Date(
                    new Date(saleData.sale_date).getTime() + (i - 1) * 30 * 24 * 60 * 60 * 1000
                  ).toISOString().split('T')[0],
                  status: installmentStatus,
                  payment_date: installmentStatus === "paid" && sale.purchase.approved_date
                    ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                    : null,
                });
              }
              
              const { error: installmentError } = await supabase
                .from("installments")
                .insert(installments);
              
              if (installmentError) {
                console.error("Installment creation error:", installmentError);
              }
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Error processing sale:", sale.transaction, error);
            failed++;
            errors.push(`${sale.transaction}: ${errorMessage}`);
          }
        }
        
        // Log import
        const authHeader = req.headers.get("Authorization");
        let userId = null;
        if (authHeader) {
          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id;
        }
        
        await supabase.from("csv_imports").insert({
          filename: `hotmart-api-sync-${new Date().toISOString()}`,
          platform: "hotmart",
          imported_by: userId,
          records_processed: sales.length,
          records_created: created,
          records_updated: updated,
          records_failed: failed,
          error_log: errors.length > 0 ? errors : null,
        });
        
        return new Response(JSON.stringify({ 
          success: true, 
          total: sales.length,
          created,
          updated,
          failed,
          errors: errors.slice(0, 10), // Limit errors in response
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Hotmart sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
