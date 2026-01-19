import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PDI {
  id: string;
  titulo: string;
  colaborador_id: string;
  data_limite: string;
  status: string;
  colaborador?: {
    full_name: string;
  }[] | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Data para "próximo do vencimento" (3 dias)
    const tresDiasAFrente = new Date(hoje);
    tresDiasAFrente.setDate(tresDiasAFrente.getDate() + 3);

    console.log("Verificando PDIs com vencimento até:", tresDiasAFrente.toISOString().split("T")[0]);
    console.log("Data de hoje:", hoje.toISOString().split("T")[0]);

    // Buscar PDIs ativos que estão próximos do vencimento ou atrasados
    const { data: pdis, error: pdisError } = await supabase
      .from("pdis")
      .select(`
        id,
        titulo,
        colaborador_id,
        data_limite,
        status,
        colaborador:profiles!colaborador_id(full_name)
      `)
      .neq("status", "finalizado")
      .lte("data_limite", tresDiasAFrente.toISOString().split("T")[0]);

    if (pdisError) {
      console.error("Erro ao buscar PDIs:", pdisError);
      throw pdisError;
    }

    console.log(`Encontrados ${pdis?.length || 0} PDIs para verificar`);

    const notificacoesEnviadas: string[] = [];

    for (const pdi of (pdis || []) as PDI[]) {
      const dataLimite = new Date(pdi.data_limite);
      dataLimite.setHours(0, 0, 0, 0);
      
      const diffDias = Math.ceil((dataLimite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      
      let notificationType: "warning" | "alert" | null = null;
      let title = "";
      let message = "";

      if (diffDias < 0) {
        // Atrasado
        notificationType = "alert";
        title = "⚠️ PDI Atrasado";
        message = `O PDI "${pdi.titulo}" está atrasado há ${Math.abs(diffDias)} dia(s). Regularize sua situação.`;
      } else if (diffDias === 0) {
        // Vence hoje
        notificationType = "alert";
        title = "🔴 PDI vence HOJE";
        message = `O PDI "${pdi.titulo}" vence hoje! Finalize suas atividades.`;
      } else if (diffDias <= 3) {
        // Próximo do vencimento (1-3 dias)
        notificationType = "warning";
        title = "⏰ PDI próximo do vencimento";
        message = `O PDI "${pdi.titulo}" vence em ${diffDias} dia(s). Não deixe para última hora!`;
      }

      if (notificationType) {
        // Verificar se já existe notificação similar nas últimas 24h para evitar spam
        const ontemISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("recipient_id", pdi.colaborador_id)
          .ilike("title", `%PDI%`)
          .ilike("message", `%${pdi.titulo}%`)
          .gte("created_at", ontemISO)
          .limit(1);

        if (!existingNotif || existingNotif.length === 0) {
          const { error: notifError } = await supabase
            .from("notifications")
            .insert({
              title,
              message,
              type: notificationType,
              recipient_id: pdi.colaborador_id,
              sender_id: null, // Sistema
            });

          if (notifError) {
            console.error(`Erro ao criar notificação para PDI ${pdi.id}:`, notifError);
          } else {
            console.log(`Notificação enviada para ${pdi.colaborador_id} - PDI: ${pdi.titulo}`);
            notificacoesEnviadas.push(pdi.id);
          }
        } else {
          console.log(`Notificação já enviada nas últimas 24h para PDI: ${pdi.titulo}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Verificação concluída. ${notificacoesEnviadas.length} notificações enviadas.`,
        pdi_ids: notificacoesEnviadas,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Erro na função check-pdi-deadlines:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
