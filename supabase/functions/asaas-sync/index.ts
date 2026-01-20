import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAsaasBaseUrl(): string {
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

interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  description: string;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate: string | null;
  confirmedDate: string | null;
  dateCreated: string;
  installmentCount?: number;
  invoiceNumber?: string;
  invoiceUrl?: string;
  installment?: string; // ID do parcelamento (agrupa todas as parcelas)
  installmentNumber?: number; // Número da parcela atual
}

interface GroupedSale {
  installmentId: string; // ID do parcelamento ou ID do pagamento único
  payments: AsaasPayment[];
  totalValue: number;
  installmentCount: number;
  customerId: string;
  description: string;
  billingType: string;
  firstPaymentDate: string;
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
        // Changed: onlyPaid defaults to false to capture all installments properly
        const { startDate, endDate, sellerId, userId, onlyPaid = false } = params;

        let allPayments: AsaasPayment[] = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        // Fetch all payments in date range
        while (hasMore) {
          let url = `${ASAAS_BASE_URL}/payments?offset=${offset}&limit=${limit}`;
          if (startDate) url += `&dateCreated[ge]=${startDate}`;
          if (endDate) url += `&dateCreated[le]=${endDate}`;
          // Only filter by status if explicitly requested
          if (onlyPaid) url += `&status=RECEIVED&status=CONFIRMED&status=RECEIVED_IN_CASH`;

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

        console.log(`[asaas-sync] Total payments fetched: ${allPayments.length}`);

        // Group payments by installment ID (parcelamento)
        // Payments with same "installment" field belong to the same sale
        const groupedSales = new Map<string, GroupedSale>();

        for (const payment of allPayments) {
          // Key: use installment ID if exists, otherwise use payment ID (single payment)
          const groupKey = payment.installment || payment.id;
          
          if (groupedSales.has(groupKey)) {
            const group = groupedSales.get(groupKey)!;
            group.payments.push(payment);
            group.totalValue += payment.value;
          } else {
            groupedSales.set(groupKey, {
              installmentId: groupKey,
              payments: [payment],
              totalValue: payment.value,
              installmentCount: payment.installmentCount || 1,
              customerId: payment.customer,
              description: payment.description,
              billingType: payment.billingType,
              firstPaymentDate: payment.dateCreated,
            });
          }
        }

        console.log(`[asaas-sync] Grouped into ${groupedSales.size} sales`);

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

        // Process each grouped sale
        for (const [externalId, group] of groupedSales) {
          try {
            // Sort payments by installment number
            group.payments.sort((a, b) => 
              (a.installmentNumber || 1) - (b.installmentNumber || 1)
            );

            // Check if sale already exists
            const { data: existingSale } = await supabase
              .from("sales")
              .select("id")
              .eq("external_id", externalId)
              .single();

            // Fetch customer details
            let clientName = "Cliente Asaas";
            let clientEmail: string | null = null;

            if (group.customerId) {
              try {
                const customerResponse = await fetch(
                  `${ASAAS_BASE_URL}/customers/${group.customerId}`,
                  { headers: asaasHeaders }
                );
                if (customerResponse.ok) {
                  const customerData = await customerResponse.json();
                  clientName = customerData.name || "Cliente Asaas";
                  clientEmail = customerData.email || null;
                }
              } catch (e) {
                console.log(`[asaas-sync] Could not fetch customer details: ${e}`);
              }
            }

            // Calculate total value from all payments (for installment sales)
            const totalValue = group.totalValue;
            const installmentCount = group.payments.length > 1 
              ? group.payments.length 
              : (group.installmentCount || 1);

            const saleData = {
              external_id: externalId,
              client_name: clientName,
              client_email: clientEmail,
              product_name: group.description || "Produto Asaas",
              total_value: totalValue,
              installments_count: installmentCount,
              platform: "asaas",
              sale_date: group.firstPaymentDate,
              status: "active",
              seller_id: sellerId || null,
              commission_percent: commissionPercent,
              payment_type: mapPaymentType(group.billingType),
              created_by: userId,
            };

            let saleId: string;

            if (existingSale) {
              // Update existing sale
              const { error: updateError } = await supabase
                .from("sales")
                .update({
                  total_value: totalValue,
                  installments_count: installmentCount,
                  payment_type: saleData.payment_type,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingSale.id);

              if (updateError) throw updateError;
              saleId = existingSale.id;
              updated++;

              // Update existing installments with external_installment_id
              for (const payment of group.payments) {
                const installmentNumber = payment.installmentNumber || 1;
                const status = mapAsaasStatus(payment.status);
                const paymentDate = status === "paid" 
                  ? payment.paymentDate || payment.confirmedDate 
                  : null;

                await supabase
                  .from("installments")
                  .update({
                    external_installment_id: payment.id,
                    status: status,
                    payment_date: paymentDate,
                  })
                  .eq("sale_id", saleId)
                  .eq("installment_number", installmentNumber);
              }
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

              // Create installments for each payment
              for (let i = 0; i < group.payments.length; i++) {
                const payment = group.payments[i];
                const installmentNumber = payment.installmentNumber || (i + 1);
                const installmentValue = payment.value;
                const status = mapAsaasStatus(payment.status);
                const paymentDate = status === "paid" 
                  ? payment.paymentDate || payment.confirmedDate 
                  : null;

                const dueDate = payment.dueDate || payment.dateCreated;

                const { data: installment, error: instError } = await supabase
                  .from("installments")
                  .insert({
                    sale_id: saleId,
                    installment_number: installmentNumber,
                    total_installments: installmentCount,
                    value: installmentValue,
                    due_date: dueDate.split("T")[0],
                    status: status,
                    payment_date: paymentDate,
                    external_installment_id: payment.id, // Track individual payment ID
                  })
                  .select("id")
                  .single();

                if (instError) throw instError;

                // Create commission only if seller is assigned
                if (sellerId) {
                  const competenceMonth = new Date(dueDate);
                  competenceMonth.setDate(1);

                  await supabase.from("commissions").insert({
                    installment_id: installment.id,
                    seller_id: sellerId,
                    installment_value: installmentValue,
                    commission_percent: commissionPercent,
                    commission_value: installmentValue * (commissionPercent / 100),
                    competence_month: competenceMonth.toISOString().split("T")[0],
                    status: status === "paid" ? "released" : "pending",
                    released_at: status === "paid" ? new Date().toISOString() : null,
                  });
                }
              }

              // If installment sale but only first payments fetched, create remaining as pending
              if (group.installmentCount && group.installmentCount > group.payments.length) {
                const firstPayment = group.payments[0];
                const avgValue = totalValue / group.installmentCount;
                
                for (let i = group.payments.length + 1; i <= group.installmentCount; i++) {
                  const dueDate = new Date(firstPayment.dueDate || firstPayment.dateCreated);
                  dueDate.setMonth(dueDate.getMonth() + (i - 1));

                  const { data: installment, error: instError } = await supabase
                    .from("installments")
                    .insert({
                      sale_id: saleId,
                      installment_number: i,
                      total_installments: group.installmentCount,
                      value: avgValue,
                      due_date: dueDate.toISOString().split("T")[0],
                      status: "pending",
                      payment_date: null,
                      external_installment_id: null, // Will be updated when payment is synced
                    })
                    .select("id")
                    .single();

                  if (instError) throw instError;

                  if (sellerId) {
                    const competenceMonth = new Date(dueDate);
                    competenceMonth.setDate(1);

                    await supabase.from("commissions").insert({
                      installment_id: installment.id,
                      seller_id: sellerId,
                      installment_value: avgValue,
                      commission_percent: commissionPercent,
                      commission_value: avgValue * (commissionPercent / 100),
                      competence_month: competenceMonth.toISOString().split("T")[0],
                      status: "pending",
                      released_at: null,
                    });
                  }
                }
              }
            }
          } catch (e: any) {
            console.error(`[asaas-sync] Error processing sale ${externalId}:`, e);
            failed++;
            errors.push({
              external_id: externalId,
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
          salesGrouped: groupedSales.size,
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

        // Get all Asaas sales with installments that have external_installment_id
        const { data: asaasSales, error: salesError } = await supabase
          .from("sales")
          .select(`
            id,
            external_id,
            seller_id,
            installments (
              id,
              status,
              installment_number,
              external_installment_id
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
            for (const installment of sale.installments || []) {
              // Skip if no external_installment_id to check
              if (!installment.external_installment_id) continue;

              // Fetch current payment status from Asaas using the payment ID
              const response = await fetch(
                `${ASAAS_BASE_URL}/payments/${installment.external_installment_id}`,
                { headers: asaasHeaders }
              );

              if (!response.ok) {
                console.log(`[asaas-sync] Payment ${installment.external_installment_id} not found`);
                continue;
              }

              const payment = await response.json();
              const newStatus = mapAsaasStatus(payment.status);

              // Update if status changed
              if (installment.status !== newStatus) {
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
                const commissionStatus = newStatus === "paid" ? "released" 
                  : newStatus === "cancelled" ? "cancelled" 
                  : "pending";

                await supabase
                  .from("commissions")
                  .update({
                    status: commissionStatus,
                    released_at: newStatus === "paid" ? new Date().toISOString() : null,
                  })
                  .eq("installment_id", installment.id);

                // Also update SDR commission if exists
                await supabase
                  .from("sdr_commissions")
                  .update({
                    status: commissionStatus,
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