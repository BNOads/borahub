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

interface HotmartOffer {
  code: string;
  name: string;
  is_main_offer: boolean;
  price: {
    value: number;
    currency_code: string;
  };
  payment_mode: string;
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
    tracking?: {
      source_sck?: string;
      source?: string;
      external_code?: string;
    };
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

// Exchange rate cache (USD and EUR to BRL)
interface ExchangeRateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}
let exchangeRateCache: ExchangeRateCache | null = null;

// Fetch exchange rates from public API (caches for 1 hour)
async function getExchangeRateToBRL(currency: string): Promise<number> {
  // BRL doesn't need conversion
  if (currency === "BRL") return 1;
  
  const now = Date.now();
  const cacheValidFor = 60 * 60 * 1000; // 1 hour
  
  // Check if cache is valid
  if (exchangeRateCache && (now - exchangeRateCache.fetchedAt) < cacheValidFor) {
    const rate = exchangeRateCache.rates[currency];
    if (rate) {
      console.log(`Using cached exchange rate for ${currency}: ${rate}`);
      return rate;
    }
  }
  
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/BRL");
    
    if (!response.ok) {
      console.error("Exchange rate API error:", response.status);
      return getFallbackRate(currency);
    }
    
    const data = await response.json();
    const rates: Record<string, number> = {};
    
    if (data.rates) {
      for (const [curr, rate] of Object.entries(data.rates)) {
        rates[curr] = 1 / (rate as number);
      }
    }
    
    exchangeRateCache = {
      rates,
      fetchedAt: now,
    };
    
    const rate = rates[currency];
    if (rate) {
      console.log(`Fetched exchange rate for ${currency}: ${rate.toFixed(4)} BRL`);
      return rate;
    }
    
    return getFallbackRate(currency);
  } catch (err) {
    console.error("Error fetching exchange rate:", err);
    return getFallbackRate(currency);
  }
}

function getFallbackRate(currency: string): number {
  const fallbackRates: Record<string, number> = {
    USD: 5.50,
    EUR: 6.00,
    GBP: 7.00,
    CAD: 4.00,
    AUD: 3.60,
    MXN: 0.32,
  };
  
  const rate = fallbackRates[currency];
  if (rate) {
    console.log(`Using fallback exchange rate for ${currency}: ${rate}`);
    return rate;
  }
  
  console.log(`Unknown currency ${currency}, assuming 1:1 rate`);
  return 1;
}

async function convertToBRL(value: number, currency: string): Promise<number> {
  if (currency === "BRL") return value;
  
  const rate = await getExchangeRateToBRL(currency);
  const convertedValue = value * rate;
  
  console.log(`Converted ${value} ${currency} -> ${convertedValue.toFixed(2)} BRL (rate: ${rate.toFixed(4)})`);
  return convertedValue;
}

async function getAccessToken(): Promise<string> {
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
  
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  
  console.log("Access token obtained successfully");
  return data.access_token;
}

async function fetchProductOffers(accessToken: string, ucode: string): Promise<HotmartOffer[]> {
  try {
    const url = `https://developers.hotmart.com/products/api/v1/products/${ucode}/offers`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.log(`No offers found for product ucode ${ucode}`);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error(`Error fetching offers for product ${ucode}:`, err);
    return [];
  }
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

    if (!nextPageToken) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  if (includePrices) {
    console.log("Fetching prices for products...");
    for (const product of allProducts) {
      const plans = await fetchProductPlans(accessToken, product.id);
      if (plans.length > 0) {
        const maxPrice = Math.max(...plans.map(p => p.price?.value || 0));
        product.price = maxPrice;
      }
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

    if (!nextPageToken || reachedPageLimit) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`Fetched ${allSales.length} sales`);
  return allSales;
}

async function fetchSaleDetails(accessToken: string, transactionId: string): Promise<any> {
  console.log(`Fetching sale details for transaction: ${transactionId}`);
  
  const response = await fetch(
    `https://developers.hotmart.com/payments/api/v1/sales/history?transaction=${transactionId}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Sale details fetch error:", response.status, errorText);
    throw new Error(`Failed to fetch sale details: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Sale details found: ${data.items?.length || 0} items, status: ${data.items?.[0]?.purchase?.status || 'unknown'}`);
  return data;
}

const PAID_STATUSES = new Set(["APPROVED", "COMPLETE", "COMPLETED"]);
const CANCELLED_STATUSES = new Set(["CANCELED", "REFUNDED", "CHARGEBACK"]);

function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.has(status);
}

function isCancelledStatus(status: string): boolean {
  return CANCELLED_STATUSES.has(status);
}

function mapHotmartStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "APPROVED": "paid",
    "COMPLETE": "paid",
    "COMPLETED": "paid",
    "CANCELED": "cancelled",
    "REFUNDED": "cancelled",
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

/**
 * Determines if this sale results in a FULL (integral) payment to the producer.
 * 
 * Credit card payments (even when buyer pays in installments) are received
 * in full by the producer. The installment is between the buyer and the card operator.
 * 
 * Billet (boleto) parcelado and recurring subscriptions are actually received
 * in installments by the producer.
 */
function isFullPayment(sale: HotmartSale): boolean {
  const paymentType = sale.purchase.payment.type;
  const isSubscription = sale.purchase.is_subscription === true;
  const recurrencyNumber = sale.purchase.recurrency_number || 0;
  
  // Credit card (not subscription, not recurring) = full payment
  if (paymentType === "CREDIT_CARD" && !isSubscription && recurrencyNumber <= 1) {
    return true;
  }
  
  return false;
}

const MARIA_ROSA_ID = "de5f094a-fd3e-4d01-9f37-78425ea3317f";

/**
 * Creates a support ticket automatically when a sale is refunded or chargebacked.
 * Includes linked task, notification, and log entry.
 */
async function createRefundTicket(
  supabase: ReturnType<typeof createClient>,
  sale: HotmartSale,
  hotmartStatus: string
): Promise<void> {
  const transactionId = sale.purchase.transaction;
  const isChargeback = hotmartStatus === "CHARGEBACK";
  const categoria = isChargeback ? "chargeback" : "reembolso";
  const statusLabel = isChargeback ? "Chargeback" : "Reembolso";
  
  // Deduplication: check if ticket already exists for this transaction
  const { data: existingTickets } = await supabase
    .from("tickets")
    .select("id")
    .ilike("descricao", `%${transactionId}%`)
    .limit(1);
  
  if (existingTickets && existingTickets.length > 0) {
    console.log(`Ticket already exists for transaction ${transactionId}, skipping`);
    return;
  }
  
  const valor = sale.purchase.price.value;
  const produto = sale.product.name;
  const slaLimite = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  
  const descricao = `⚠️ ${statusLabel} automático detectado pela sincronização Hotmart.\n\n` +
    `📋 Transação: ${transactionId}\n` +
    `📦 Produto: ${produto}\n` +
    `💰 Valor: R$ ${valor.toFixed(2)}\n` +
    `👤 Cliente: ${sale.buyer.name}\n` +
    `📧 E-mail: ${sale.buyer.email}\n` +
    `📱 Telefone: ${sale.buyer.phone || "Não informado"}\n` +
    `🔴 Status Hotmart: ${hotmartStatus}`;
  
  // 1. Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      cliente_nome: sale.buyer.name,
      cliente_email: sale.buyer.email,
      cliente_whatsapp: sale.buyer.phone || "",
      origem: "hotmart",
      categoria,
      descricao,
      prioridade: "critica",
      responsavel_id: MARIA_ROSA_ID,
      criado_por: MARIA_ROSA_ID,
      sla_limite: slaLimite,
    })
    .select("id, numero")
    .single();
  
  if (ticketError) {
    console.error(`Failed to create refund ticket for ${transactionId}:`, ticketError);
    return;
  }
  
  console.log(`Created refund ticket #${ticket.numero} for transaction ${transactionId} (${statusLabel})`);
  
  // 2. Get Maria Rosa's name for task
  const { data: respProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", MARIA_ROSA_ID)
    .single();
  
  // 3. Create linked task
  const taskTitle = `Resolver Ticket #${ticket.numero} - ${sale.buyer.name} (${statusLabel})`;
  const dueDateFromSla = new Date(slaLimite).toISOString().split("T")[0];
  
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title: taskTitle,
      description: descricao,
      priority: "alta",
      assignee: respProfile?.full_name ?? null,
      assigned_to_id: MARIA_ROSA_ID,
      due_date: dueDateFromSla,
      created_by_id: MARIA_ROSA_ID,
      ticket_id: ticket.id,
    })
    .select("id")
    .single();
  
  if (!taskError && task) {
    await supabase
      .from("tickets")
      .update({ linked_task_id: task.id })
      .eq("id", ticket.id);
  }
  
  // 4. Log creation
  await supabase.from("ticket_logs").insert({
    ticket_id: ticket.id,
    usuario_id: null,
    usuario_nome: "Sistema Automático",
    acao: "criado",
    descricao: `Ticket criado automaticamente pela sincronização Hotmart (${statusLabel})`,
  });
  
  // 5. Notify Maria Rosa
  await supabase.from("notifications").insert({
    title: `🔴 ${statusLabel} Hotmart - ${sale.buyer.name}`,
    message: `${statusLabel} detectado para ${sale.buyer.name} (${transactionId}). Ticket #${ticket.numero} criado com SLA de 2h.`,
    type: "warning",
    recipient_id: MARIA_ROSA_ID,
    sender_id: null,
  });
}

serve(async (req) => {
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

        const products = await fetchProducts(accessToken);

        if (!includePricesSafe) {
          return new Response(JSON.stringify({ success: true, products }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Fetching product prices from Offers API for get_products...");
        const productsWithPrices = [];
        
        for (const product of products) {
          const offers = await fetchProductOffers(accessToken, product.ucode);
          
          let productPrice = 0;
          const mainOffer = offers.find(o => o.is_main_offer);
          if (mainOffer?.price?.value) {
            productPrice = mainOffer.price.value;
          } else if (offers.length > 0) {
            const maxPrice = Math.max(...offers.map(o => o.price?.value || 0));
            if (maxPrice > 0) {
              productPrice = maxPrice;
            }
          }
          
          productsWithPrices.push({
            ...product,
            price: productPrice,
          });
          
          await new Promise(r => setTimeout(r, 50));
        }
        
        console.log(`Fetched prices for ${productsWithPrices.filter(p => p.price > 0).length} products`);

        return new Response(JSON.stringify({ success: true, products: productsWithPrices }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_products": {
        const hotmartProducts = await fetchProducts(accessToken, false);
        
        console.log("Fetching product prices from Offers API...");
        
        let created = 0;
        let updated = 0;
        let pricesFound = 0;
        
        for (const product of hotmartProducts) {
          const offers = await fetchProductOffers(accessToken, product.ucode);
          
          let productPrice = 0;
          const mainOffer = offers.find(o => o.is_main_offer);
          if (mainOffer?.price?.value) {
            productPrice = mainOffer.price.value;
            pricesFound++;
          } else if (offers.length > 0) {
            const maxPrice = Math.max(...offers.map(o => o.price?.value || 0));
            if (maxPrice > 0) {
              productPrice = maxPrice;
              pricesFound++;
            }
          }
          
          console.log(`Product ${product.name}: price from offers = ${productPrice}`);
          
          const { data: existingProduct } = await supabase
            .from("products")
            .select("id")
            .or(`name.eq.${product.name},description.ilike.%${product.ucode}%`)
            .limit(1)
            .maybeSingle();
          
          const productData = {
            name: product.name,
            description: `Hotmart ID: ${product.id} | UCode: ${product.ucode}`,
            is_active: product.status === "ACTIVE",
            price: productPrice,
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
                default_commission_percent: 5,
              });
            created++;
          }
          
          await new Promise(r => setTimeout(r, 100));
        }
        
        return new Response(JSON.stringify({
          success: true, 
          total: hotmartProducts.length,
          created,
          updated,
          pricesFound,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_installments": {
        console.log("Syncing installments from Hotmart (including single-payment sales)");
        
        const { data: hotmartSales, error: salesError } = await supabase
          .from("sales")
          .select("id, external_id, installments_count, payment_type")
          .eq("platform", "hotmart");
        
        if (salesError) throw salesError;
        
        let updated = 0;
        let failed = 0;
        const errors: string[] = [];
        
        for (const sale of hotmartSales || []) {
          try {
            const details = await fetchSaleDetails(accessToken, sale.external_id);
            
            if (!details?.items?.[0]) {
              console.log(`No details found for transaction: ${sale.external_id}`);
              continue;
            }
            
            const saleInfo = details.items[0];
            const purchaseStatus = saleInfo.purchase?.status || "PENDING";
            console.log(`Transaction ${sale.external_id}: status=${purchaseStatus}`);
            
            // Check if this is a full payment (credit card, non-subscription)
            const fullPayment = isFullPayment(saleInfo);
            const isSingleInstallment = fullPayment || (sale.installments_count || 1) === 1;
            const recurrencyNumber = saleInfo.purchase?.recurrency_number || 0;
            
            const { data: installments } = await supabase
              .from("installments")
              .select("id, installment_number, status, total_installments")
              .eq("sale_id", sale.id)
              .order("installment_number");
            
            if (!installments) continue;
            
            for (const installment of installments) {
              let installmentIsPaid = false;
              
              if (isSingleInstallment || installment.total_installments === 1) {
                installmentIsPaid = isPaidStatus(purchaseStatus);
              } else {
                installmentIsPaid = installment.installment_number <= recurrencyNumber && isPaidStatus(purchaseStatus);
              }
              
              const newStatus = installmentIsPaid ? "paid" : 
                               isCancelledStatus(purchaseStatus) ? "cancelled" :
                               "pending";
              
              console.log(`Installment ${installment.installment_number}: current=${installment.status}, calculated=${newStatus}, hotmartStatus=${purchaseStatus}`);
              
              if (installment.status !== newStatus) {
                console.log(`Updating installment ${installment.id}: ${installment.status} -> ${newStatus}`);
                await supabase
                  .from("installments")
                  .update({ 
                    status: newStatus,
                    payment_date: installmentIsPaid ? new Date().toISOString().split('T')[0] : null,
                  })
                  .eq("id", installment.id);
                
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
        const details = await fetchSaleDetails(accessToken, transactionId);
        return new Response(JSON.stringify({ success: true, summary: details }), {
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
            const originalValue = sale.purchase.price.value;
            const originalCurrency = sale.purchase.price.currency_code || "BRL";
            const valueInBRL = await convertToBRL(originalValue, originalCurrency);
            
            console.log(`Sale ${sale.purchase.transaction}: ${originalValue} ${originalCurrency} -> ${valueInBRL.toFixed(2)} BRL`);
            
            // Determine installments count: credit card (non-subscription) = always 1
            const fullPayment = isFullPayment(sale);
            const effectiveInstallments = fullPayment ? 1 : (sale.purchase.payment.installments_number || 1);
            
            if (fullPayment) {
              console.log(`Sale ${sale.purchase.transaction}: CREDIT_CARD full payment detected, forcing installments_count=1 (original: ${sale.purchase.payment.installments_number})`);
            }
            
            const saleData = {
              external_id: sale.purchase.transaction,
              client_name: sale.buyer.name,
              client_email: sale.buyer.email,
              client_phone: sale.buyer.phone || null,
              product_name: sale.product.name,
              total_value: Math.round(valueInBRL * 100) / 100,
              original_value: originalCurrency !== "BRL" ? originalValue : null,
              original_currency: originalCurrency !== "BRL" ? originalCurrency : null,
              installments_count: effectiveInstallments,
              platform: "hotmart",
              commission_percent: 0,
              sale_date: sale.purchase.approved_date 
                ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              status: mapHotmartStatus(sale.purchase.status) === "paid" ? "active" : "cancelled",
              seller_id: null,
              payment_type: sale.purchase.payment.type || null,
              tracking_source: sale.purchase.tracking?.source || null,
              tracking_source_sck: sale.purchase.tracking?.source_sck || null,
              tracking_external_code: sale.purchase.tracking?.external_code || null,
              funnel_source: sale.purchase.tracking?.source_sck || sale.purchase.tracking?.source || sale.purchase.tracking?.external_code || null,
            };
            
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
              
              // Update installments - for full payment, single installment with total value
              if (fullPayment) {
                // Delete extra installments if they exist
                await supabase
                  .from("installments")
                  .delete()
                  .eq("sale_id", existingSale.id)
                  .gt("installment_number", 1);
                
                const installmentStatus = isPaidStatus(sale.purchase.status) ? "paid" : "pending";
                
                await supabase
                  .from("installments")
                  .upsert({
                    sale_id: existingSale.id,
                    installment_number: 1,
                    total_installments: 1,
                    value: saleData.total_value,
                    due_date: saleData.sale_date,
                    status: installmentStatus,
                    payment_date: installmentStatus === "paid" && sale.purchase.approved_date
                      ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                      : null,
                  }, {
                    onConflict: "sale_id,installment_number",
                  });
              } else {
                const installmentValue = saleData.total_value / saleData.installments_count;
                for (let i = 1; i <= saleData.installments_count; i++) {
                  const recurrencyNumber = sale.purchase.recurrency_number || 0;
                  const installmentStatus = i <= recurrencyNumber 
                    ? mapHotmartStatus(sale.purchase.status)
                    : "pending";
                  
                  await supabase
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
              
              // Create installments - for full payment, single installment with total value
              if (fullPayment) {
                const installmentStatus = isPaidStatus(sale.purchase.status) ? "paid" : "pending";
                
                await supabase.from("installments").insert({
                  sale_id: newSale.id,
                  installment_number: 1,
                  total_installments: 1,
                  value: saleData.total_value,
                  due_date: saleData.sale_date,
                  status: installmentStatus,
                  payment_date: installmentStatus === "paid" && sale.purchase.approved_date
                    ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                    : null,
                });
              } else {
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
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Error processing sale:", sale.purchase.transaction, error);
            failed++;
            errors.push(`${sale.purchase.transaction}: ${errorMessage}`);
          }
        }
        
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
          errors: errors.slice(0, 10),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "scheduled_sync": {
        console.log("Starting scheduled Hotmart sync");
        
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
          const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const end = new Date();
          
          console.log(`Fetching sales from ${start.toISOString()} to ${end.toISOString()}`);
          const sales = await fetchSalesHistory(accessToken, start, end);
          
          let created = 0;
          let updated = 0;
          let failed = 0;
          let installmentsUpdated = 0;
          const errors: string[] = [];
          
          for (const sale of sales) {
            try {
              const trackingSource = sale.purchase.tracking?.source || null;
              const trackingSourceSck = sale.purchase.tracking?.source_sck || null;
              const trackingExternalCode = sale.purchase.tracking?.external_code || null;
              
              let funnelSource: string | null = null;
              if (trackingSourceSck) {
                funnelSource = trackingSourceSck;
              } else if (trackingSource) {
                funnelSource = trackingSource;
              } else if (trackingExternalCode) {
                funnelSource = trackingExternalCode;
              }
              
              // Determine installments count: credit card (non-subscription) = always 1
              const fullPayment = isFullPayment(sale);
              const effectiveInstallments = fullPayment ? 1 : (sale.purchase.payment.installments_number || 1);
              
              if (fullPayment) {
                console.log(`Sale ${sale.purchase.transaction}: CREDIT_CARD full payment, forcing installments_count=1 (original: ${sale.purchase.payment.installments_number})`);
              }
              
              const saleData = {
                external_id: sale.purchase.transaction,
                client_name: sale.buyer.name,
                client_email: sale.buyer.email,
                client_phone: sale.buyer.phone || null,
                product_name: sale.product.name,
                total_value: sale.purchase.price.value,
                installments_count: effectiveInstallments,
                platform: "hotmart",
                commission_percent: 0,
                sale_date: sale.purchase.approved_date 
                  ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0],
                status: mapHotmartStatus(sale.purchase.status) === "paid" ? "active" : "cancelled",
                seller_id: null,
                payment_type: sale.purchase.payment.type || null,
                tracking_source: trackingSource,
                tracking_source_sck: trackingSourceSck,
                tracking_external_code: trackingExternalCode,
                funnel_source: funnelSource,
              };
              
              const { data: existingSale } = await supabase
                .from("sales")
                .select("id, status")
                .eq("external_id", sale.purchase.transaction)
                .single();
              
              if (existingSale) {
                const previousStatus = existingSale.status;
                
                const { error } = await supabase
                  .from("sales")
                  .update(saleData)
                  .eq("id", existingSale.id);
                
                if (error) throw error;
                updated++;
                
                // Auto-create ticket for refunds/chargebacks
                const hotmartStatus = sale.purchase.status;
                if (
                  previousStatus === "active" &&
                  saleData.status === "cancelled" &&
                  (hotmartStatus === "REFUNDED" || hotmartStatus === "CHARGEBACK")
                ) {
                  try {
                    await createRefundTicket(supabase, sale, hotmartStatus);
                  } catch (ticketErr) {
                    console.error(`Failed to create refund ticket for ${sale.purchase.transaction}:`, ticketErr);
                  }
                }
                
                if (fullPayment) {
                  // For full payment: ensure only 1 installment with total value
                  // Delete extra installments first
                  await supabase
                    .from("installments")
                    .delete()
                    .eq("sale_id", existingSale.id)
                    .gt("installment_number", 1);
                  
                  const installmentStatus = isPaidStatus(sale.purchase.status) ? "paid" : 
                                           isCancelledStatus(sale.purchase.status) ? "cancelled" : "pending";
                  
                  const { data: existingInst } = await supabase
                    .from("installments")
                    .select("id, status")
                    .eq("sale_id", existingSale.id)
                    .eq("installment_number", 1)
                    .maybeSingle();
                  
                  if (existingInst) {
                    if (existingInst.status !== installmentStatus) {
                      await supabase
                        .from("installments")
                        .update({ 
                          status: installmentStatus,
                          value: saleData.total_value,
                          total_installments: 1,
                          payment_date: installmentStatus === "paid" && sale.purchase.approved_date
                            ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                            : null,
                        })
                        .eq("id", existingInst.id);
                      
                      const commissionStatus = installmentStatus === "paid" ? "released" :
                                              installmentStatus === "cancelled" ? "cancelled" : "pending";
                      
                      await supabase
                        .from("commissions")
                        .update({ 
                          status: commissionStatus,
                          released_at: installmentStatus === "paid" ? new Date().toISOString() : null,
                        })
                        .eq("installment_id", existingInst.id);
                      
                      installmentsUpdated++;
                    }
                  }
                } else {
                  // Multi-installment: update status based on recurrency_number
                  const recurrencyNumber = sale.purchase.recurrency_number || 0;
                  const { data: installments } = await supabase
                    .from("installments")
                    .select("id, installment_number, status")
                    .eq("sale_id", existingSale.id);
                  
                  for (const inst of installments || []) {
                    const instIsPaid = inst.installment_number <= recurrencyNumber && isPaidStatus(sale.purchase.status);
                    
                    const newStatus = instIsPaid ? "paid" : 
                                     isCancelledStatus(sale.purchase.status) ? "cancelled" :
                                     "pending";
                    
                    if (inst.status !== newStatus) {
                      await supabase
                        .from("installments")
                        .update({ 
                          status: newStatus,
                          payment_date: instIsPaid && sale.purchase.approved_date
                            ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                            : null,
                        })
                        .eq("id", inst.id);
                      
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
                }
              } else {
                const { data: newSale, error } = await supabase
                  .from("sales")
                  .insert(saleData)
                  .select("id")
                  .single();
                
                if (error) throw error;
                created++;
                
                if (fullPayment) {
                  // Single installment with total value
                  const installmentStatus = isPaidStatus(sale.purchase.status) ? "paid" : "pending";
                  
                  await supabase.from("installments").insert({
                    sale_id: newSale.id,
                    installment_number: 1,
                    total_installments: 1,
                    value: saleData.total_value,
                    due_date: saleData.sale_date,
                    status: installmentStatus,
                    payment_date: installmentStatus === "paid" && sale.purchase.approved_date
                      ? new Date(sale.purchase.approved_date).toISOString().split('T')[0]
                      : null,
                  });
                } else {
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
            .select("id, external_id, payment_type, installments_count")
            .eq("platform", "hotmart");
          
          for (const existingSale of existingHotmartSales || []) {
            try {
              const details = await fetchSaleDetails(accessToken, existingSale.external_id);
              
              if (!details?.items?.[0]) continue;
              
              const saleInfo = details.items[0];
              const recurrencyNumber = saleInfo.purchase?.recurrency_number || 1;
              const purchaseStatus = saleInfo.purchase?.status || "PENDING";
              
              // Check if this is a full payment sale
              const fullPayment = isFullPayment(saleInfo);
              
              const { data: installments } = await supabase
                .from("installments")
                .select("id, installment_number, status")
                .eq("sale_id", existingSale.id)
                .order("installment_number");
              
              if (!installments) continue;
              
              if (fullPayment) {
                // For full payment: mark installment 1 as paid if status is paid
                for (const installment of installments) {
                  if (installment.installment_number === 1) {
                    const instIsPaid = isPaidStatus(purchaseStatus);
                    const newStatus = instIsPaid ? "paid" : 
                                     isCancelledStatus(purchaseStatus) ? "cancelled" : "pending";
                    
                    if (installment.status !== newStatus) {
                      await supabase
                        .from("installments")
                        .update({ 
                          status: newStatus,
                          payment_date: instIsPaid ? new Date().toISOString().split('T')[0] : null,
                        })
                        .eq("id", installment.id);
                      
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
                  // Extra installments (>1) for full payment should not exist,
                  // but they'll be cleaned up by the migration
                }
              } else {
                for (const installment of installments) {
                  const instIsPaid = installment.installment_number <= recurrencyNumber && isPaidStatus(purchaseStatus);
                  
                  const newStatus = instIsPaid ? "paid" : 
                                   isCancelledStatus(purchaseStatus) ? "cancelled" :
                                   "pending";
                  
                  if (installment.status !== newStatus) {
                    await supabase
                      .from("installments")
                      .update({ 
                        status: newStatus,
                        payment_date: instIsPaid ? new Date().toISOString().split('T')[0] : null,
                      })
                      .eq("id", installment.id);
                    
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
              }
              
              await new Promise(r => setTimeout(r, 100));
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              console.error(`Error syncing installments for sale ${existingSale.external_id}:`, err);
              errors.push(`Installment sync ${existingSale.external_id}: ${errorMessage}`);
            }
          }
          
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
      
      case "update_tracking": {
        console.log("Updating tracking info for existing Hotmart sales");
        
        const { data: hotmartSales, error: salesError } = await supabase
          .from("sales")
          .select("id, external_id, tracking_source, tracking_source_sck, tracking_external_code")
          .eq("platform", "hotmart")
          .is("tracking_source_sck", null)
          .order("sale_date", { ascending: false })
          .limit(100);
        
        if (salesError) throw salesError;
        
        const { count: totalMissing } = await supabase
          .from("sales")
          .select("id", { count: "exact", head: true })
          .eq("platform", "hotmart")
          .is("tracking_source_sck", null);
        
        console.log(`Processing batch of ${hotmartSales?.length || 0} sales (${totalMissing} total remaining)`);
        
        let updated = 0;
        let failed = 0;
        const errors: string[] = [];
        
        for (const sale of hotmartSales || []) {
          try {
            const details = await fetchSaleDetails(accessToken, sale.external_id);
            
            if (!details?.items?.[0]) {
              console.log(`No details found for transaction: ${sale.external_id}`);
              await supabase
                .from("sales")
                .update({ tracking_source_sck: "" })
                .eq("id", sale.id);
              continue;
            }
            
            const saleInfo = details.items[0];
            const tracking = saleInfo.purchase?.tracking;
            
            const trackingData = {
              tracking_source: tracking?.source || null,
              tracking_source_sck: tracking?.source_sck || "",
              tracking_external_code: tracking?.external_code || null,
            };
            
            console.log(`Updating tracking for ${sale.external_id}: source=${tracking?.source}, sck=${tracking?.source_sck}, code=${tracking?.external_code}`);
            
            const { error: updateError } = await supabase
              .from("sales")
              .update(trackingData)
              .eq("id", sale.id);
            
            if (updateError) throw updateError;
            updated++;
            
            await new Promise(r => setTimeout(r, 50));
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`Error updating tracking for sale ${sale.external_id}:`, err);
            failed++;
            errors.push(`${sale.external_id}: ${errorMessage}`);
          }
        }
        
        const remainingAfter = (totalMissing || 0) - updated;
        console.log(`Tracking update batch completed: ${updated} updated, ${failed} failed, ${remainingAfter} remaining`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          batch_size: hotmartSales?.length || 0,
          updated,
          failed,
          remaining: remainingAfter,
          errors: errors.slice(0, 10),
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
