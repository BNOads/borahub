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

    // Sales - with more detailed data
    if (scope.includes("sales")) {
      const { data: sales } = await supabase
        .from("sales")
        .select("*, installments(*), profiles:seller_id(full_name)")
        .gte("sale_date", period_start)
        .lte("sale_date", period_end);
      
      // Calculate comprehensive totals
      if (sales && sales.length > 0) {
        const totalRevenue = sales.reduce((sum, s) => sum + (s.total_value || 0), 0);
        const approvedSales = sales.filter((s) => s.status === "approved");
        const approvedRevenue = approvedSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
        const pendingSales = sales.filter((s) => s.status === "pending");
        const canceledSales = sales.filter((s) => s.status === "canceled" || s.status === "refunded");
        
        // Group by product
        const salesByProduct: Record<string, { count: number; revenue: number }> = {};
        sales.forEach((s) => {
          const product = s.product_name || "Produto não especificado";
          if (!salesByProduct[product]) {
            salesByProduct[product] = { count: 0, revenue: 0 };
          }
          salesByProduct[product].count++;
          salesByProduct[product].revenue += s.total_value || 0;
        });
        
        // Group by seller
        const salesBySeller: Record<string, { count: number; revenue: number }> = {};
        sales.forEach((s) => {
          const seller = s.profiles?.full_name || "Vendedor não atribuído";
          if (!salesBySeller[seller]) {
            salesBySeller[seller] = { count: 0, revenue: 0 };
          }
          salesBySeller[seller].count++;
          salesBySeller[seller].revenue += s.total_value || 0;
        });
        
        consolidatedData.salesSummary = {
          total: sales.length,
          approved: approvedSales.length,
          pending: pendingSales.length,
          canceled: canceledSales.length,
          totalRevenue,
          approvedRevenue,
          avgTicket: sales.length > 0 ? totalRevenue / sales.length : 0,
          byProduct: salesByProduct,
          bySeller: salesBySeller,
        };
        
        // Include recent sales list (limited)
        consolidatedData.recentSales = sales.slice(0, 20).map((s) => ({
          date: s.sale_date,
          product: s.product_name,
          value: s.total_value,
          status: s.status,
          seller: s.profiles?.full_name,
        }));
      } else {
        consolidatedData.salesSummary = {
          total: 0,
          approved: 0,
          pending: 0,
          canceled: 0,
          totalRevenue: 0,
          approvedRevenue: 0,
          avgTicket: 0,
          byProduct: {},
          bySeller: {},
        };
      }
    }

    // Tasks - with detailed person breakdown
    if (scope.includes("tasks")) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*, profiles:assigned_to(full_name)")
        .or(`created_at.gte.${period_start},updated_at.gte.${period_start}`);
      
      // Filter tasks that were active in the period
      const periodTasks = (tasks || []).filter((t) => {
        const createdAt = new Date(t.created_at);
        const updatedAt = new Date(t.updated_at);
        const start = new Date(period_start);
        const end = new Date(period_end + "T23:59:59");
        return (createdAt >= start && createdAt <= end) || (updatedAt >= start && updatedAt <= end);
      });
      
      consolidatedData.tasks = periodTasks;

      // Group by assignee with detailed stats
      if (periodTasks.length > 0) {
        const tasksByPerson: Record<string, { 
          total: number; 
          completed: number; 
          inProgress: number;
          pending: number;
          completedTasks: string[];
        }> = {};
        
        periodTasks.forEach((t) => {
          const name = t.profiles?.full_name || "Não atribuída";
          if (!tasksByPerson[name]) {
            tasksByPerson[name] = { 
              total: 0, 
              completed: 0, 
              inProgress: 0, 
              pending: 0,
              completedTasks: [] 
            };
          }
          tasksByPerson[name].total++;
          if (t.status === "done") {
            tasksByPerson[name].completed++;
            tasksByPerson[name].completedTasks.push(t.title);
          } else if (t.status === "in_progress") {
            tasksByPerson[name].inProgress++;
          } else {
            tasksByPerson[name].pending++;
          }
        });
        
        consolidatedData.tasksSummary = tasksByPerson;
        consolidatedData.tasksOverview = {
          totalTasks: periodTasks.length,
          completed: periodTasks.filter((t) => t.status === "done").length,
          inProgress: periodTasks.filter((t) => t.status === "in_progress").length,
          pending: periodTasks.filter((t) => t.status === "todo" || t.status === "pending").length,
        };
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
Sua tarefa é gerar um relatório executivo profissional e COMPLETO baseado nos dados fornecidos.

REGRAS IMPORTANTES:
- Nunca invente números ou dados que não foram fornecidos
- Se faltar dados em alguma área, sinalize explicitamente
- Use tom profissional e objetivo
- Formate em Markdown com seções claras
- Use **negrito** para destacar números importantes e métricas chave
- Destaque insights e recomendações
- Inclua alertas para riscos identificados
- Sugira próximos passos quando apropriado

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO:
1. Resumo Executivo (2-3 parágrafos resumindo os principais acontecimentos e resultados)

2. Para cada escopo selecionado, INCLUA UMA SEÇÃO COMPLETA:
   - Se "sales" estiver no escopo: Seção detalhada de VENDAS E FATURAMENTO com:
     * Total de vendas e faturamento bruto
     * Vendas aprovadas vs pendentes vs canceladas  
     * Ranking de produtos mais vendidos
     * Ranking de vendedores por faturamento
     * Ticket médio
   
   - Se "tasks" estiver no escopo: Seção detalhada de TAREFAS POR PESSOA com:
     * Visão geral (total, concluídas, em andamento, pendentes)
     * Lista COMPLETA de cada pessoa com suas tarefas
     * Quantidade de tarefas concluídas por cada pessoa
     * Nomes das tarefas concluídas por cada pessoa
     * Taxa de conclusão por pessoa
   
   - Se "events" estiver no escopo: Lista de eventos realizados
   - Se "funnels" estiver no escopo: Status dos funis de marketing
   - Se "content" estiver no escopo: Resumo de conteúdos publicados

3. Alertas e Riscos (gargalos, atrasos, problemas identificados)
4. Próximos Passos Recomendados com responsáveis quando possível`;

    const userPrompt = `Gere um relatório executivo COMPLETO E DETALHADO para o período de ${period_start} a ${period_end}.

TIPO DE RELATÓRIO: ${report_type}
ESCOPOS SELECIONADOS: ${scope.join(", ")}

IMPORTANTE: Para CADA escopo selecionado, você DEVE incluir uma seção dedicada com TODOS os dados disponíveis.

DADOS CONSOLIDADOS:
${JSON.stringify(consolidatedData, null, 2)}

Por favor, analise esses dados e gere um relatório COMPLETO em Markdown, cobrindo TODOS os escopos selecionados com seus dados detalhados.`;

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
      pending: number;
      canceled: number;
      totalRevenue: number;
      approvedRevenue: number;
      avgTicket: number;
      byProduct: Record<string, { count: number; revenue: number }>;
      bySeller: Record<string, { count: number; revenue: number }>;
    };
    report += `## Vendas e Faturamento\n\n`;
    report += `### Visão Geral\n\n`;
    report += `- Total de vendas: **${summary.total}**\n`;
    report += `- Vendas aprovadas: **${summary.approved}**\n`;
    report += `- Vendas pendentes: **${summary.pending}**\n`;
    report += `- Vendas canceladas: **${summary.canceled}**\n`;
    report += `- Faturamento total: **R$ ${summary.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**\n`;
    report += `- Faturamento aprovado: **R$ ${summary.approvedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**\n`;
    report += `- Ticket médio: **R$ ${summary.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**\n\n`;
    
    if (Object.keys(summary.byProduct).length > 0) {
      report += `### Vendas por Produto\n\n`;
      Object.entries(summary.byProduct)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .forEach(([product, stats]) => {
          report += `- **${product}**: ${stats.count} vendas - R$ ${stats.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
        });
      report += `\n`;
    }
    
    if (Object.keys(summary.bySeller).length > 0) {
      report += `### Vendas por Vendedor\n\n`;
      Object.entries(summary.bySeller)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .forEach(([seller, stats]) => {
          report += `- **${seller}**: ${stats.count} vendas - R$ ${stats.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
        });
      report += `\n`;
    }
  }

  if (scope.includes("tasks") && data.tasksSummary) {
    const summary = data.tasksSummary as Record<string, { 
      total: number; 
      completed: number; 
      inProgress: number;
      pending: number;
      completedTasks: string[];
    }>;
    const overview = data.tasksOverview as { totalTasks: number; completed: number; inProgress: number; pending: number } | undefined;
    
    report += `## Tarefas por Pessoa\n\n`;
    
    if (overview) {
      report += `### Visão Geral\n\n`;
      report += `- Total de tarefas: **${overview.totalTasks}**\n`;
      report += `- Concluídas: **${overview.completed}**\n`;
      report += `- Em andamento: **${overview.inProgress}**\n`;
      report += `- Pendentes: **${overview.pending}**\n\n`;
    }
    
    report += `### Detalhamento por Pessoa\n\n`;
    Object.entries(summary).forEach(([person, stats]) => {
      const completion = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0;
      report += `#### ${person}\n\n`;
      report += `- Total: **${stats.total}** | Concluídas: **${stats.completed}** | Em andamento: **${stats.inProgress}** | Pendentes: **${stats.pending}**\n`;
      report += `- Taxa de conclusão: **${completion}%**\n`;
      if (stats.completedTasks && stats.completedTasks.length > 0) {
        report += `- Tarefas concluídas:\n`;
        stats.completedTasks.slice(0, 10).forEach((task) => {
          report += `  - ${task}\n`;
        });
        if (stats.completedTasks.length > 10) {
          report += `  - ... e mais ${stats.completedTasks.length - 10} tarefas\n`;
        }
      }
      report += `\n`;
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
