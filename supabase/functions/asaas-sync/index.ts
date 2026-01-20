import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAsaasBaseUrl(): string {
  // Supported env vars (configure as secrets):
  // - ASAAS_BASE_URL: full base URL override (e.g. https://sandbox.asaas.com/api/v3)
  // - ASAAS_ENV: "sandbox" | "prod" (default: prod)
  const explicit = Deno.env.get("ASAAS_BASE_URL")?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const env = (Deno.env.get("ASAAS_ENV") || "prod").trim().toLowerCase();
  if (env === "sandbox") return "https://sandbox.asaas.com/api/v3";
  return "https://api.asaas.com/v3";
}

const ASAAS_STATUS_MAP: Record<string, string> = {
  "RECEIVED": "paid",
  "CONFIRMED": "paid",
  "RECEIVED_IN_CASH": "paid",
  "PENDING": "pending",
  "AWAITING_RISK_ANALYSIS": "pending",
  "OVERDUE": "overdue",
  "REFUNDED": "cancelled",
  "REFUND_REQUESTED": "pending",
  "REFUND_IN_PROGRESS": "pending",
  "CHARGEBACK_REQUESTED": "chargeback",
  "CHARGEBACK_DISPUTE": "chargeback",
  "AWAITING_CHARGEBACK_REVERSAL": "chargeback",
  "DUNNING_REQUESTED": "overdue",
  "DUNNING_RECEIVED": "paid",
};

function mapAsaasStatus(asaasStatus: string): string {
  return ASAAS_STATUS_MAP[asaasStatus] || "pending";
}

function mapPaymentType(billingType: string): string {
  const typeMap: Record<string, string> = {
    "BOLETO": "boleto",
    "CREDIT_CARD": "credit_card",
    "PIX": "pix",
    "DEBIT_CARD": "debit_card",
    "TRANSFER": "transfer",
    "UNDEFINED": "other",
  };
  return typeMap[billingType] || "other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    console.log(`[asaas-sync] Action: ${action}`, params);

    const ASAAS_BASE_URL = getAsaasBaseUrl();

    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY,
    };

    switch (action) {
      case "get_payments": {
        const { startDate, endDate, status, offset = 0, limit = 100 } = params;
        
        let url = `${ASAAS_BASE_URL}/payments?offset=${offset}&limit=${limit}`;
        if (startDate) url += `&dateCreated[ge]=${startDate}`;
        if (endDate) url += `&dateCreated[le]=${endDate}`;
        if (status) url += `&status=${status}`;

        console.log(`[asaas-sync] Fetching payments from: ${url}`);

         const response = await fetch(url, { headers: asaasHeaders });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[asaas-sync] Asaas API error: ${errorText}`);
           throw new Error(
             `Asaas API error (${ASAAS_BASE_URL}): ${response.status} - ${errorText}`
           );
        }

        const data = await response.json();
        console.log(`[asaas-sync] Found ${data.data?.length || 0} payments`);

        return new Response(JSON.stringify({
          success: true,
          payments: data.data || [],
          hasMore: data.hasMore,
          totalCount: data.totalCount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_payments": {
        const { startDate, endDate, sellerId, userId } = params;

        if (!sellerId) {
          throw new Error("sellerId é obrigatório para sincronização");
        }

        let allPayments: any[] = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        // Fetch all payments in date range
        while (hasMore) {
          let url = `${ASAAS_BASE_URL}/payments?offset=${offset}&limit=${limit}`;
          if (startDate) url += `&dateCreated[ge]=${startDate}`;
          if (endDate) url += `&dateCreated[le]=${endDate}`;

          const response = await fetch(url, { headers: asaasHeaders });
           if (!response.ok) {
            const errorText = await response.text();
             throw new Error(
               `Asaas API error (${ASAAS_BASE_URL}): ${response.status} - ${errorText}`
             );
          }

          const data = await response.json();
          allPayments = allPayments.concat(data.data || []);
          hasMore = data.hasMore;
          offset += limit;

          console.log(`[asaas-sync] Fetched ${allPayments.length} payments so far...`);
        }

        console.log(`[asaas-sync] Total payments to sync: ${allPayments.length}`);

        let created = 0;
        let updated = 0;
        let failed = 0;
        const errors: any[] = [];

        // Get default product for Asaas sales
        const { data: defaultProduct } = await supabase
          .from("products")
          .select("id, default_commission_percent")
          .eq("is_active", true)
          .limit(1)
          .single();

        const commissionPercent = defaultProduct?.default_commission_percent || 10;

        for (const payment of allPayments) {
          try {
            const externalId = payment.id;
            const status = mapAsaasStatus(payment.status);
            const saleStatus = ["paid", "pending", "overdue"].includes(status) ? "active" : "cancelled";

            // Check if sale already exists
            const { data: existingSale } = await supabase
              .from("sales")
              .select("id")
              .eq("external_id", externalId)
              .single();

            const saleData = {
              external_id: externalId,
              client_name: payment.customer || "Cliente Asaas",
              client_email: null as string | null,
              product_name: payment.description || "Produto Asaas",
              total_value: payment.value || 0,
              installments_count: payment.installmentCount || 1,
              platform: "asaas",
              sale_date: payment.dateCreated,
              status: saleStatus,
              seller_id: sellerId,
              commission_percent: commissionPercent,
              payment_type: mapPaymentType(payment.billingType),
              created_by: userId,
            };

            // Fetch customer details for email
            if (payment.customer) {
              try {
                const customerResponse = await fetch(
                  `${ASAAS_BASE_URL}/customers/${payment.customer}`,
                  { headers: asaasHeaders }
                );
                if (customerResponse.ok) {
                  const customerData = await customerResponse.json();
                  saleData.client_name = customerData.name || "Cliente Asaas";
                  saleData.client_email = customerData.email || null;
                }
              } catch (e) {
                console.log(`[asaas-sync] Could not fetch customer details: ${e}`);
              }
            }

            let saleId: string;

            if (existingSale) {
              // Update existing sale
              const { error: updateError } = await supabase
                .from("sales")
                .update({
                  status: saleStatus,
                  payment_type: saleData.payment_type,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingSale.id);

              if (updateError) throw updateError;
              saleId = existingSale.id;
              updated++;
            } else {
              // Create new sale
              const { data: newSale, error: createError } = await supabase
                .from("sales")
                .insert(saleData)
                .select("id")
                .single();

              if (createError) throw createError;
              saleId = newSale.id;
              created++;

              // Create installments
              const installmentCount = payment.installmentCount || 1;
              const installmentValue = (payment.value || 0) / installmentCount;

              for (let i = 1; i <= installmentCount; i++) {
                const dueDate = new Date(payment.dueDate || payment.dateCreated);
                dueDate.setMonth(dueDate.getMonth() + (i - 1));

                const installmentStatus = i === 1 ? status : "pending";
                const paymentDate = i === 1 && status === "paid" ? payment.paymentDate || payment.confirmedDate : null;

                const { data: installment, error: instError } = await supabase
                  .from("installments")
                  .insert({
                    sale_id: saleId,
                    installment_number: i,
                    total_installments: installmentCount,
                    value: installmentValue,
                    due_date: dueDate.toISOString().split("T")[0],
                    status: installmentStatus,
                    payment_date: paymentDate,
                  })
                  .select("id")
                  .single();

                if (instError) throw instError;

                // Create commission for this installment
                const competenceMonth = new Date(dueDate);
                competenceMonth.setDate(1);

                await supabase.from("commissions").insert({
                  installment_id: installment.id,
                  seller_id: sellerId,
                  installment_value: installmentValue,
                  commission_percent: commissionPercent,
                  commission_value: installmentValue * (commissionPercent / 100),
                  competence_month: competenceMonth.toISOString().split("T")[0],
                  status: installmentStatus === "paid" ? "released" : "pending",
                  released_at: installmentStatus === "paid" ? new Date().toISOString() : null,
                });
              }
            }
          } catch (e: any) {
            console.error(`[asaas-sync] Error processing payment ${payment.id}:`, e);
            failed++;
            errors.push({
              payment_id: payment.id,
              error: e.message,
            });
          }
        }

        // Log the sync operation
        await supabase.from("csv_imports").insert({
          filename: `asaas-api-sync-${new Date().toISOString()}`,
          platform: "asaas",
          imported_by: userId,
          records_processed: allPayments.length,
          records_created: created,
          records_updated: updated,
          records_failed: failed,
          error_log: errors.length > 0 ? errors : null,
        });

        console.log(`[asaas-sync] Sync complete: ${created} created, ${updated} updated, ${failed} failed`);

        return new Response(JSON.stringify({
          success: true,
          total: allPayments.length,
          created,
          updated,
          failed,
          errors: errors.slice(0, 10),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_installments": {
        const { userId } = params;

        // Get all Asaas sales with pending installments
        const { data: asaasSales, error: salesError } = await supabase
          .from("sales")
          .select(`
            id,
            external_id,
            seller_id,
            installments!inner (
              id,
              status,
              installment_number
            )
          `)
          .eq("platform", "asaas")
          .eq("status", "active");

        if (salesError) throw salesError;

        console.log(`[asaas-sync] Checking ${asaasSales?.length || 0} Asaas sales for updates`);

        let updatedCount = 0;
        const errors: any[] = [];

        for (const sale of asaasSales || []) {
          try {
            // Fetch current payment status from Asaas
            const response = await fetch(
              `${ASAAS_BASE_URL}/payments/${sale.external_id}`,
              { headers: asaasHeaders }
            );

               if (!response.ok) {
              console.log(`[asaas-sync] Payment ${sale.external_id} not found`);
              continue;
            }

            const payment = await response.json();
            const newStatus = mapAsaasStatus(payment.status);

            // Update installments that need updating
            for (const installment of sale.installments) {
              if (installment.status !== newStatus && 
                  (newStatus === "paid" || newStatus === "cancelled")) {
                
                const paymentDate = newStatus === "paid" 
                  ? payment.paymentDate || payment.confirmedDate || new Date().toISOString()
                  : null;

                // Update installment
                await supabase
                  .from("installments")
                  .update({
                    status: newStatus,
                    payment_date: paymentDate,
                  })
                  .eq("id", installment.id);

                // Update commission
                await supabase
                  .from("commissions")
                  .update({
                    status: newStatus === "paid" ? "released" : "cancelled",
                    released_at: newStatus === "paid" ? new Date().toISOString() : null,
                  })
                  .eq("installment_id", installment.id);

                // Also update SDR commission if exists
                await supabase
                  .from("sdr_commissions")
                  .update({
                    status: newStatus === "paid" ? "released" : "cancelled",
                    released_at: newStatus === "paid" ? new Date().toISOString() : null,
                  })
                  .eq("installment_id", installment.id);

                updatedCount++;
                console.log(`[asaas-sync] Updated installment ${installment.id} to ${newStatus}`);
              }
            }
          } catch (e: any) {
            console.error(`[asaas-sync] Error updating sale ${sale.id}:`, e);
            errors.push({
              sale_id: sale.id,
              error: e.message,
            });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          salesChecked: asaasSales?.length || 0,
          installmentsUpdated: updatedCount,
          errors: errors.slice(0, 10),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }
  } catch (error: any) {
    console.error("[asaas-sync] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
