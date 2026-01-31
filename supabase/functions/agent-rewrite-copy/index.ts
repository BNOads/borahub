import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é um copywriter especializado na metodologia e tom de voz da marca BORAnaOBRA, estilo "Rafa + Alex".

Sua tarefa é REESCREVER uma copy existente seguindo as instruções do usuário, mantendo as diretrizes da marca.

## DIRETRIZES OBRIGATÓRIAS

### Tom e Voz
- Direto, maduro, calmo, seguro
- Profissional e humano
- Confiante sem arrogância
- EMPATIA COM DIREÇÃO: acolhe a dor, MAS conduz para decisão
- Nunca valida a permanência no erro
- NUNCA: guru, agressivo, apelativo, infantilizador, motivacional vazio

### Metáforas de Obra (OBRIGATÓRIO)
- Use metáforas de OBRA, PROJETO, FUNDAÇÃO, EXECUÇÃO ou DETALHE
- Mostre causa e consequência como em uma obra mal planejada
- Traduza abstrações em situações concretas do canteiro ou da gestão
- Exemplos: "Negócio sem método é obra sem projeto", "Você não começa obra pelo telhado"

### Linguagem
- Frases curtas (12-15 palavras em média)
- Parágrafos pequenos (máximo 4 linhas)
- Sem travessão (—)
- Máximo 2 emojis
- Sem jargões de marketing digital (página, carrinho, lançamento, clique, leads, tráfego, conversão, gatilho, webinar, masterclass)
- Use palavras-chave: método, clareza, direção, estrutura, decisão, liberdade

### Branding
- A marca é SEMPRE escrita como: BORAnaOBRA
- NUNCA: boranaobra, BORANAOBRA, Bora na Obra, etc.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      original_copy,
      instructions,
      channel
    } = await req.json();

    if (!original_copy || !instructions) {
      return new Response(
        JSON.stringify({ error: "Copy original e instruções são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Reescreva a copy abaixo seguindo as instruções do usuário.

## COPY ORIGINAL
${original_copy}

## INSTRUÇÕES DO USUÁRIO
${instructions}

## CANAL
${channel || "Não especificado"}

## IMPORTANTE
1. Mantenha a essência da mensagem original
2. Aplique as instruções do usuário
3. Siga todas as diretrizes BORAnaOBRA
4. Mantenha o formato adequado ao canal
5. Retorne APENAS a copy reescrita, sem explicações`;

    console.log(`Rewriting copy for channel: ${channel}`);

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
        tools: [
          {
            type: "function",
            function: {
              name: "agent_rewrite_copy",
              description: "Retorna a copy reescrita no estilo BORAnaOBRA",
              parameters: {
                type: "object",
                properties: {
                  copy: {
                    type: "string",
                    description: "O texto da copy reescrita seguindo as diretrizes BORAnaOBRA"
                  }
                },
                required: ["copy"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "agent_rewrite_copy" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao reescrever copy" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "agent_rewrite_copy") {
      console.error("Unexpected AI response format:", JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: "Formato de resposta inesperado da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Copy rewritten successfully");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in agent-rewrite-copy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
