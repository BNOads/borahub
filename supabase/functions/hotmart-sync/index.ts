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
  price?: number;
}

interface HotmartProductPlan {
  price: {
    currency_code: string;
    value: number;
  };
  payment_mode: string;
  name: string;
  code: string;
}

interface HotmartSale {
  product: {
    id: number;
    name: string;
    ucode?: string;
  };
  buyer: {
    name: string;
    email: string;
    phone?: string;
    ucode?: string;
  };
  purchase: {
    transaction: string;
    approved_date?: number;
    order_date?: number;
    status: string;
    price: {
      value: number;
      currency_code: string;
    };
    payment: {
      type: string;
      installments_number: number;
      method?: string;
    };
    recurrency_number?: number;
    is_subscription?: boolean;
  };
  producer?: {
    name: string;
    ucode?: string;
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

async function fetchProductPlans(accessToken: string, productId: number): Promise<HotmartProductPlan[]> {
  try {
    const url = `https://developers.hotmart.com/products/api/v1/products/${productId}/plans`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.log(`No plans found for product ${productId}`);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error(`Error fetching plans for product ${productId}:`, err);
    return [];
  }
}

async function fetchProducts(accessToken: string, includePrices: boolean = false): Promise<HotmartProduct[]> {
  console.log("Fetching products from Hotmart");

  const allProducts: HotmartProduct[] = [];
  let nextPageToken: string | null = null;

  while (true) {
    const params = new URLSearchParams();
    params.set("max_results", "50");
    if (nextPageToken) params.set("page_token", nextPageToken);

    const url = `https://developers.hotmart.com/products/api/v1/products?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Products fetch error:", response.status, errorText);
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    const data = await response.json();
    const products = data.items || [];
    allProducts.push(...products);

    nextPageToken = data.page_info?.next_page_token ?? null;

    // Rate limiting: wait 100ms between requests
    if (!nextPageToken) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  // Fetch prices for each product if requested
  if (includePrices) {
    console.log("Fetching prices for products...");
    for (const product of allProducts) {
      const plans = await fetchProductPlans(accessToken, product.id);
      if (plans.length > 0) {
        // Get the highest price among all plans (main product price)
        const maxPrice = Math.max(...plans.map(p => p.price?.value || 0));
        product.price = maxPrice;
      }
      // Rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`Fetched ${allProducts.length} products`);
  return allProducts;
}

async function fetchSalesHistory(
  accessToken: string,
  startDate: Date,
  endDate: Date,
  status?: string,
  options?: { maxPages?: number }
): Promise<HotmartSale[]> {
  console.log("Fetching sales history from Hotmart");

  const allSales: HotmartSale[] = [];
  let nextPageToken: string | null = null;
  let pageCount = 0;

  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  // Hotmart expects specific status values
  const normalizeStatus = (s: string) => {
    const map: Record<string, string> = {
      COMPLETED: "COMPLETE",
      CANCELED: "CANCELLED",
      PROTEST: "PROTESTED",
    };
    return map[s] || s;
  };

  while (true) {
    pageCount++;

    const params = new URLSearchParams();
    params.set("start_date", String(startTimestamp));
    params.set("end_date", String(endTimestamp));
    params.set("max_results", "50");
    if (nextPageToken) params.set("page_token", nextPageToken);
    if (status) params.set("transaction_status", normalizeStatus(status));

    const url = `https://developers.hotmart.com/payments/api/v1/sales/history?${params.toString()}`;

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

    nextPageToken = data.page_info?.next_page_token ?? null;

    const reachedPageLimit = !!options?.maxPages && pageCount >= options.maxPages;

    // Rate limiting: wait 100ms between requests
    if (!nextPageToken || reachedPageLimit) break;
    await new Promise((r) => setTimeout(r, 100));
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

    const { action, startDate, endDate, status, transactionId, sellerId, includePrices, priceDays, salesMaxPages } = await req.json();
    
    console.log(`Hotmart sync action: ${action}`);
    
    const accessToken = await getAccessToken();
    
    switch (action) {
      case "get_products": {
        const includePricesSafe = includePrices === true;
        const priceDaysSafe = typeof priceDays === "number" ? priceDays : 30;
        const salesMaxPagesSafe = typeof salesMaxPages === "number" ? salesMaxPages : 6;

        const products = await fetchProducts(accessToken);

        if (!includePricesSafe) {
          return new Response(JSON.stringify({ success: true, products }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fast-ish price enrichment using a limited slice of recent sales
        console.log("Fetching recent sales to get product prices for get_products...");
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - priceDaysSafe * 24 * 60 * 60 * 1000);
        const recentSales = await fetchSalesHistory(accessToken, startDate, endDate, undefined, {
          maxPages: salesMaxPagesSafe,
        });

        // Build price map from sales (using product.id)
        const productPrices = new Map<number, number>();
        for (const sale of recentSales) {
          const productId = sale.product.id;
          const price = sale.purchase.price.value;
          if (!productPrices.has(productId) || price > productPrices.get(productId)!) {
            productPrices.set(productId, price);
          }
        }
        console.log(`Found prices for ${productPrices.size} products from sales`);

        const productsWithPrices = products.map((product) => ({
          ...product,
          price: productPrices.get(product.id) || 0,
        }));

        return new Response(JSON.stringify({ success: true, products: productsWithPrices }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_products": {
        // Fetch products without individual price lookups (faster sync)
        const hotmartProducts = await fetchProducts(accessToken, false);
        
        // Fetch recent sales to get product prices
        console.log("Fetching recent sales to get product prices...");
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days (faster)
        const recentSales = await fetchSalesHistory(accessToken, startDate, endDate, undefined, { maxPages: 20 });
        
        // Build price map from sales (using product.id)
        const productPrices = new Map<number, number>();
        for (const sale of recentSales) {
          const productId = sale.product.id;
          const price = sale.purchase.price.value;
          // Keep the highest price found for each product
          if (!productPrices.has(productId) || price > productPrices.get(productId)!) {
            productPrices.set(productId, price);
          }
        }
        console.log(`Found prices for ${productPrices.size} products from sales`);
        
        let created = 0;
        let updated = 0;
        
        for (const product of hotmartProducts) {
          // Check if product already exists by name or ucode
          const { data: existingProduct } = await supabase
            .from("products")
            .select("id")
            .or(`name.eq.${product.name},description.ilike.%${product.ucode}%`)
            .limit(1)
            .maybeSingle();
          
          // Get price from sales or default to 0
          const priceFromSales = productPrices.get(product.id) || 0;
          
          const productData = {
            name: product.name,
            description: `Hotmart ID: ${product.id} | UCode: ${product.ucode}`,
            is_active: product.status === "ACTIVE",
            price: priceFromSales,
          };
          
          if (existingProduct) {
            await supabase
              .from("products")
              .update(productData)
              .eq("id", existingProduct.id);
            updated++;
          } else {
            await supabase
              .from("products")
              .insert({
                ...productData,
                default_commission_percent: 10, // Default commission
              });
            created++;
          }
        }
        
        return new Response(JSON.stringify({
          success: true, 
          total: hotmartProducts.length,
          created,
          updated,
          pricesFound: productPrices.size,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_installments": {
        // Fetch subscriptions and payments to update installment statuses
        // Now also handles single-installment sales (parcela única)
        console.log("Syncing installments from Hotmart (including single-payment sales)");
        
        // Get all sales from Hotmart platform with installment info
        const { data: hotmartSales, error: salesError } = await supabase
          .from("sales")
          .select("id, external_id, installments_count")
          .eq("platform", "hotmart");
        
        if (salesError) throw salesError;
        
        let updated = 0;
        let failed = 0;
        const errors: string[] = [];
        
        for (const sale of hotmartSales || []) {
          try {
            // Get sale details from Hotmart
            const summary = await fetchSaleSummary(accessToken, sale.external_id);
            
            if (!summary?.items?.[0]) continue;
            
            const saleInfo = summary.items[0];
            const purchaseStatus = saleInfo.purchase?.status || "PENDING";
            const isSingleInstallment = (sale.installments_count || 1) === 1;
            const recurrencyNumber = saleInfo.purchase?.recurrency_number || 0;
            
            // Get installments for this sale
            const { data: installments } = await supabase
              .from("installments")
              .select("id, installment_number, status, total_installments")
              .eq("sale_id", sale.id)
              .order("installment_number");
            
            if (!installments) continue;
            
            for (const installment of installments) {
              // Determine if this installment is paid:
              // - For single-installment sales: check if purchase status is APPROVED/COMPLETED
              // - For multi-installment sales: check recurrency_number
              let isPaid = false;
              
              if (isSingleInstallment || installment.total_installments === 1) {
                // Single payment sale - mark as paid if status is APPROVED or COMPLETED
                isPaid = purchaseStatus === "APPROVED" || purchaseStatus === "COMPLETED";
              } else {
                // Multi-installment sale - use recurrency_number
                isPaid = installment.installment_number <= recurrencyNumber && 
                         (purchaseStatus === "APPROVED" || purchaseStatus === "COMPLETED");
              }
              
              const newStatus = isPaid ? "paid" : 
                               (purchaseStatus === "CANCELED" || purchaseStatus === "REFUNDED") ? "cancelled" :
                               "pending";
              
              if (installment.status !== newStatus) {
                // Update installment
                await supabase
                  .from("installments")
                  .update({ 
                    status: newStatus,
                    payment_date: isPaid ? new Date().toISOString().split('T')[0] : null,
                  })
                  .eq("id", installment.id);
                
                // Update commission
                const commissionStatus = newStatus === "paid" ? "released" :
                                        newStatus === "cancelled" ? "cancelled" : "pending";
                
                await supabase
                  .from("commissions")
                  .update({ 
                    status: commissionStatus,
                    released_at: newStatus === "paid" ? new Date().toISOString() : null,
                  })
                  .eq("installment_id", installment.id);
                
                updated++;
              }
            }
            
            // Rate limiting
            await new Promise(r => setTimeout(r, 100));
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`Error syncing sale ${sale.external_id}:`, err);
            failed++;
            errors.push(`${sale.external_id}: ${errorMessage}`);
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          sales_checked: hotmartSales?.length || 0,
          installments_updated: updated,
          failed,
          errors: errors.slice(0, 10),
        }), {
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
              external_id: sale.purchase.transaction,
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
              .eq("external_id", sale.purchase.transaction)
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
            console.error("Error processing sale:", sale.purchase.transaction, error);
            failed++;
            errors.push(`${sale.purchase.transaction}: ${errorMessage}`);
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
      
      case "scheduled_sync": {
        // Automated sync triggered by cron job
        console.log("Starting scheduled Hotmart sync");
        
        // Create sync log entry
        const { data: syncLog, error: logError } = await supabase
          .from("hotmart_sync_logs")
          .insert({
            sync_type: "scheduled",
            status: "running",
          })
          .select("id")
          .single();
        
        if (logError) {
          console.error("Failed to create sync log:", logError);
        }
        
        const logId = syncLog?.id;
        
        try {
          // Sync last 24 hours of sales
          const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const end = new Date();
          
          console.log(`Fetching sales from ${start.toISOString()} to ${end.toISOString()}`);
          const sales = await fetchSalesHistory(accessToken, start, end);
          
          let created = 0;
          let updated = 0;
          let failed = 0;
          let installmentsUpdated = 0;
          const errors: string[] = [];
          
          // Get default seller (first active seller) for scheduled syncs
          const { data: defaultSeller } = await supabase
            .from("profiles")
            .select("id")
            .eq("is_active", true)
            .limit(1)
            .single();
          
          for (const sale of sales) {
            try {
              const saleData = {
                external_id: sale.purchase.transaction,
                client_name: sale.buyer.name,
                client_email: sale.buyer.email,
                client_phone: sale.buyer.phone || null,
                product_name: sale.product.name,
                total_value: sale.purchase.price.value,
                installments_count: sale.purchase.payment.installments_number || 1,
                platform: "hotmart",
                commission_percent: 0,
                sale_date: sale.purchase.approved_date 
                  ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0],
                status: mapHotmartStatus(sale.purchase.status) === "paid" ? "active" : "cancelled",
                seller_id: defaultSeller?.id || null,
              };
              
              // Check if sale already exists
              const { data: existingSale } = await supabase
                .from("sales")
                .select("id")
                .eq("external_id", sale.purchase.transaction)
                .single();
              
              if (existingSale) {
                const { error } = await supabase
                  .from("sales")
                  .update(saleData)
                  .eq("id", existingSale.id);
                
                if (error) throw error;
                updated++;
                
                // Update installments status based on recurrency_number
                const recurrencyNumber = sale.purchase.recurrency_number || 0;
                const { data: installments } = await supabase
                  .from("installments")
                  .select("id, installment_number, status")
                  .eq("sale_id", existingSale.id);
                
                for (const inst of installments || []) {
                  const isPaid = inst.installment_number <= recurrencyNumber && 
                                 (sale.purchase.status === "APPROVED" || sale.purchase.status === "COMPLETED");
                  
                  const newStatus = isPaid ? "paid" : 
                                   (sale.purchase.status === "CANCELED" || sale.purchase.status === "REFUNDED") ? "cancelled" :
                                   "pending";
                  
                  if (inst.status !== newStatus) {
                    await supabase
                      .from("installments")
                      .update({ 
                        status: newStatus,
                        payment_date: isPaid && sale.purchase.approved_date
                          ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                          : null,
                      })
                      .eq("id", inst.id);
                    
                    // Update commission
                    const commissionStatus = newStatus === "paid" ? "released" :
                                            newStatus === "cancelled" ? "cancelled" : "pending";
                    
                    await supabase
                      .from("commissions")
                      .update({ 
                        status: commissionStatus,
                        released_at: newStatus === "paid" ? new Date().toISOString() : null,
                      })
                      .eq("installment_id", inst.id);
                    
                    installmentsUpdated++;
                  }
                }
              } else {
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
                
                await supabase.from("installments").insert(installments);
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error("Error processing sale:", sale.purchase.transaction, error);
              failed++;
              errors.push(`${sale.purchase.transaction}: ${errorMessage}`);
            }
          }
          
          // Also sync installments for existing Hotmart sales
          console.log("Syncing installments for existing Hotmart sales...");
          const { data: existingHotmartSales } = await supabase
            .from("sales")
            .select("id, external_id")
            .eq("platform", "hotmart");
          
          for (const existingSale of existingHotmartSales || []) {
            try {
              // Get sale details from Hotmart
              const summary = await fetchSaleSummary(accessToken, existingSale.external_id);
              
              if (!summary?.items?.[0]) continue;
              
              const saleInfo = summary.items[0];
              const recurrencyNumber = saleInfo.purchase?.recurrency_number || 1;
              const purchaseStatus = saleInfo.purchase?.status || "PENDING";
              
              // Get installments for this sale
              const { data: installments } = await supabase
                .from("installments")
                .select("id, installment_number, status")
                .eq("sale_id", existingSale.id)
                .order("installment_number");
              
              if (!installments) continue;
              
              for (const installment of installments) {
                // Determine if this installment is paid based on recurrency
                const isPaid = installment.installment_number <= recurrencyNumber && 
                               (purchaseStatus === "APPROVED" || purchaseStatus === "COMPLETED");
                
                const newStatus = isPaid ? "paid" : 
                                 (purchaseStatus === "CANCELED" || purchaseStatus === "REFUNDED") ? "cancelled" :
                                 "pending";
                
                if (installment.status !== newStatus) {
                  // Update installment
                  await supabase
                    .from("installments")
                    .update({ 
                      status: newStatus,
                      payment_date: isPaid ? new Date().toISOString().split('T')[0] : null,
                    })
                    .eq("id", installment.id);
                  
                  // Update commission
                  const commissionStatus = newStatus === "paid" ? "released" :
                                          newStatus === "cancelled" ? "cancelled" : "pending";
                  
                  await supabase
                    .from("commissions")
                    .update({ 
                      status: commissionStatus,
                      released_at: newStatus === "paid" ? new Date().toISOString() : null,
                    })
                    .eq("installment_id", installment.id);
                  
                  installmentsUpdated++;
                }
              }
              
              // Rate limiting
              await new Promise(r => setTimeout(r, 100));
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              console.error(`Error syncing installments for sale ${existingSale.external_id}:`, err);
              errors.push(`Installment sync ${existingSale.external_id}: ${errorMessage}`);
            }
          }
          
          // Update sync log with results
          if (logId) {
            await supabase
              .from("hotmart_sync_logs")
              .update({
                completed_at: new Date().toISOString(),
                status: failed === 0 ? "success" : "partial",
                total_records: sales.length,
                created_records: created,
                updated_records: updated,
                failed_records: failed,
                error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
                details: { errors: errors.slice(0, 20), installments_updated: installmentsUpdated },
              })
              .eq("id", logId);
          }
          
          console.log(`Scheduled sync completed: ${created} created, ${updated} updated, ${installmentsUpdated} installments updated, ${failed} failed`);
          
          return new Response(JSON.stringify({ 
            success: true, 
            scheduled: true,
            total: sales.length,
            created,
            updated,
            installments_updated: installmentsUpdated,
            failed,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Scheduled sync error:", error);
          
          // Update sync log with error
          if (logId) {
            await supabase
              .from("hotmart_sync_logs")
              .update({
                completed_at: new Date().toISOString(),
                status: "error",
                error_message: errorMessage,
              })
              .eq("id", logId);
          }
          
          throw error;
        }
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
