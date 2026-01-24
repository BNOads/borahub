import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt_template, answers, quiz_title, lead_name } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from answers
    const answersContext = answers
      .map((a: { question: string; answer: string }, i: number) => 
        `${i + 1}. ${a.question}\nResposta: ${a.answer}`
      )
      .join("\n\n");

    const systemPrompt = `Você é um especialista em análise de diagnósticos e perfis baseados em quizzes. 
Gere um diagnóstico personalizado, profissional e acionável baseado nas respostas do usuário.
O diagnóstico deve ser em português brasileiro, empático e construtivo.
Formate a resposta em markdown com seções claras.`;

    const userPrompt = prompt_template
      ? `${prompt_template}

QUIZ: ${quiz_title}
${lead_name ? `NOME DO RESPONDENTE: ${lead_name}` : ""}

RESPOSTAS DO QUIZ:
${answersContext}

Gere o diagnóstico personalizado baseado nessas respostas e nos critérios definidos acima.`
      : `QUIZ: ${quiz_title}
${lead_name ? `NOME DO RESPONDENTE: ${lead_name}` : ""}

RESPOSTAS DO QUIZ:
${answersContext}

Gere um diagnóstico personalizado e acionável baseado nessas respostas. 
Inclua: resumo do perfil, pontos fortes, áreas de melhoria e próximos passos recomendados.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const diagnosis = data.choices?.[0]?.message?.content || "Não foi possível gerar o diagnóstico.";

    return new Response(JSON.stringify({ diagnosis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating AI diagnosis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
