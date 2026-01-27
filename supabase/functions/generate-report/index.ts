import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateReportRequest {
  title: string;
  report_type: string;
  period_start: string;
  period_end: string;
  scope: string[];
  filters?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Create client for auth validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Create service client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, report_type, period_start, period_end, scope, filters } =
      (await req.json()) as GenerateReportRequest;

    console.log("Generating report:", { title, report_type, period_start, period_end, scope });

    // Create initial report record
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        title,
        report_type,
        period_start,
        period_end,
        scope,
        filters: filters || {},
        generated_by: userId,
        status: "generating",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating report:", insertError);
      throw new Error("Erro ao criar relatório");
    }

    // Consolidate data from all relevant tables
    const consolidatedData: Record<string, unknown> = {};

    // Events
    if (scope.includes("events")) {
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", period_start)
        .lte("event_date", period_end);
      consolidatedData.events = events || [];
    }

    // Funnels
    if (scope.includes("funnels")) {
      const { data: funnels } = await supabase
        .from("funnels")
        .select("*, funnel_checklist(*)")
        .or(`captacao_start.gte.${period_start},captacao_end.lte.${period_end}`);
      consolidatedData.funnels = funnels || [];
    }

    // Sales
    if (scope.includes("sales")) {
      const { data: sales } = await supabase
        .from("sales")
        .select("*, installments(*)")
        .gte("sale_date", period_start)
        .lte("sale_date", period_end);
      consolidatedData.sales = sales || [];

      // Calculate totals
      if (sales && sales.length > 0) {
        const totalRevenue = sales.reduce((sum, s) => sum + (s.total_value || 0), 0);
        const approvedSales = sales.filter((s) => s.status === "approved");
        consolidatedData.salesSummary = {
          total: sales.length,
          approved: approvedSales.length,
          totalRevenue,
          avgTicket: sales.length > 0 ? totalRevenue / sales.length : 0,
        };
      }
    }

    // Tasks
    if (scope.includes("tasks")) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*, profiles:assigned_to(full_name)")
        .gte("created_at", period_start)
        .lte("created_at", `${period_end}T23:59:59`);
      consolidatedData.tasks = tasks || [];

      // Group by assignee
      if (tasks && tasks.length > 0) {
        const tasksByPerson: Record<string, { total: number; completed: number }> = {};
        tasks.forEach((t) => {
          const name = t.profiles?.full_name || "Não atribuída";
          if (!tasksByPerson[name]) {
            tasksByPerson[name] = { total: 0, completed: 0 };
          }
          tasksByPerson[name].total++;
          if (t.status === "done") {
            tasksByPerson[name].completed++;
          }
        });
        consolidatedData.tasksSummary = tasksByPerson;
      }
    }

    // Sponsors
    if (scope.includes("sponsors")) {
      const { data: sponsors } = await supabase
        .from("sponsors")
        .select("*")
        .gte("created_at", period_start)
        .lte("created_at", `${period_end}T23:59:59`);
      consolidatedData.sponsors = sponsors || [];
    }

    // Content/Posts
    if (scope.includes("content")) {
      const { data: posts } = await supabase
        .from("social_posts")
        .select("*")
        .gte("scheduled_date", period_start)
        .lte("scheduled_date", period_end);
      consolidatedData.posts = posts || [];
    }

    console.log("Consolidated data:", Object.keys(consolidatedData));

    // Build prompt for AI
    const systemPrompt = `Você é um analista de operações experiente do BORA Hub, uma plataforma de gestão empresarial.
Sua tarefa é gerar um relatório executivo profissional baseado nos dados fornecidos.

REGRAS IMPORTANTES:
- Nunca invente números ou dados que não foram fornecidos
- Se faltar dados em alguma área, sinalize explicitamente
- Use tom profissional e objetivo
- Formate em Markdown com seções claras
- Destaque insights e recomendações
- Inclua alertas para riscos identificados
- Sugira próximos passos quando apropriado

ESTRUTURA DO RELATÓRIO:
1. Resumo Executivo (2-3 parágrafos resumindo os principais acontecimentos)
2. Blocos temáticos baseados no escopo selecionado
3. Alertas e Riscos (se houver)
4. Próximos Passos Recomendados`;

    const userPrompt = `Gere um relatório executivo para o período de ${period_start} a ${period_end}.

TIPO DE RELATÓRIO: ${report_type}
ESCOPOS SELECIONADOS: ${scope.join(", ")}

DADOS CONSOLIDADOS:
${JSON.stringify(consolidatedData, null, 2)}

Por favor, analise esses dados e gere um relatório completo em Markdown.`;

    let reportContent = "";
    let aiSuggestions: Array<{
      title: string;
      description: string;
      suggested_scope: string[];
    }> = [];

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error("AI API error:", aiResponse.status);
          throw new Error("Erro na API de IA");
        }

        const aiData = await aiResponse.json();
        reportContent = aiData.choices?.[0]?.message?.content || "";

        // Generate suggestions
        const suggestionsPrompt = `Com base nos dados do relatório gerado, sugira 3-5 outros relatórios úteis que poderiam ser gerados.

Para cada sugestão, forneça:
- title: Nome do relatório
- description: Valor que ele entrega (1 frase)
- suggested_scope: Array com os escopos recomendados (events, funnels, sales, tasks, sponsors, content)

Responda APENAS com um JSON array válido, sem markdown ou explicações.`;

        const suggestionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Você é um assistente que retorna apenas JSON válido." },
              { role: "user", content: suggestionsPrompt },
            ],
          }),
        });

        if (suggestionsResponse.ok) {
          const suggestionsData = await suggestionsResponse.json();
          const suggestionsText = suggestionsData.choices?.[0]?.message?.content || "[]";
          try {
            // Clean JSON if wrapped in code blocks
            const cleanJson = suggestionsText.replace(/```json\n?|\n?```/g, "").trim();
            aiSuggestions = JSON.parse(cleanJson);
          } catch {
            console.error("Failed to parse suggestions:", suggestionsText);
          }
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        // Generate fallback report
        reportContent = generateFallbackReport(consolidatedData, period_start, period_end, scope);
      }
    } else {
      console.warn("LOVABLE_API_KEY not configured, using fallback");
      reportContent = generateFallbackReport(consolidatedData, period_start, period_end, scope);
    }

    // Update report with content
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        content_markdown: reportContent,
        ai_suggestions: aiSuggestions,
        status: "completed",
        generated_at: new Date().toISOString(),
      })
      .eq("id", report.id);

    if (updateError) {
      console.error("Error updating report:", updateError);
      throw new Error("Erro ao salvar relatório");
    }

    return new Response(JSON.stringify({ id: report.id, status: "completed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate report error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateFallbackReport(
  data: Record<string, unknown>,
  periodStart: string,
  periodEnd: string,
  scope: string[]
): string {
  let report = `# Relatório de Operações\n\n`;
  report += `**Período:** ${periodStart} a ${periodEnd}\n\n`;
  report += `---\n\n`;

  report += `## Resumo Executivo\n\n`;
  report += `Este relatório consolida os dados do período selecionado para os seguintes escopos: ${scope.join(", ")}.\n\n`;

  if (scope.includes("events") && Array.isArray(data.events)) {
    const events = data.events as Array<{ title: string; event_date: string }>;
    report += `## Eventos\n\n`;
    if (events.length > 0) {
      report += `Total de eventos no período: **${events.length}**\n\n`;
      events.slice(0, 5).forEach((e) => {
        report += `- ${e.title} (${e.event_date})\n`;
      });
      if (events.length > 5) {
        report += `- ... e mais ${events.length - 5} eventos\n`;
      }
    } else {
      report += `Nenhum evento registrado no período.\n`;
    }
    report += `\n`;
  }

  if (scope.includes("sales") && data.salesSummary) {
    const summary = data.salesSummary as {
      total: number;
      approved: number;
      totalRevenue: number;
      avgTicket: number;
    };
    report += `## Vendas e Faturamento\n\n`;
    report += `- Total de vendas: **${summary.total}**\n`;
    report += `- Vendas aprovadas: **${summary.approved}**\n`;
    report += `- Faturamento total: **R$ ${summary.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**\n`;
    report += `- Ticket médio: **R$ ${summary.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**\n\n`;
  }

  if (scope.includes("tasks") && data.tasksSummary) {
    const summary = data.tasksSummary as Record<string, { total: number; completed: number }>;
    report += `## Tarefas por Pessoa\n\n`;
    Object.entries(summary).forEach(([person, stats]) => {
      const completion = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0;
      report += `- **${person}**: ${stats.completed}/${stats.total} concluídas (${completion}%)\n`;
    });
    report += `\n`;
  }

  if (scope.includes("funnels") && Array.isArray(data.funnels)) {
    const funnels = data.funnels as Array<{ name: string; status: string }>;
    report += `## Funis de Marketing\n\n`;
    if (funnels.length > 0) {
      report += `Total de funis ativos: **${funnels.length}**\n\n`;
      funnels.slice(0, 5).forEach((f) => {
        report += `- ${f.name} (${f.status || "em andamento"})\n`;
      });
    } else {
      report += `Nenhum funil ativo no período.\n`;
    }
    report += `\n`;
  }

  report += `---\n\n`;
  report += `## Próximos Passos\n\n`;
  report += `> Analise os dados acima e defina ações prioritárias para o próximo período.\n\n`;
  report += `*Relatório gerado automaticamente pelo BORA Hub.*\n`;

  return report;
}
