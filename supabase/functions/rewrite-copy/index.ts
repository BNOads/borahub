import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é um copywriter especializado na metodologia e tom de voz da marca BORAnaOBRA, estilo "Rafa + Alex".

Sua tarefa é reescrever textos de marketing corrigindo os problemas identificados, mantendo a essência e intenção original.

## DIRETRIZES OBRIGATÓRIAS

### Tom e Voz
- Direto, maduro, calmo, seguro
- Profissional e humano
- Confiante sem arrogância
- EMPATIA COM DIREÇÃO: acolhe a dor, MAS conduz para decisão
- Nunca valida a permanência no erro
- NUNCA: guru, agressivo, apelativo, infantilizador, motivacional vazio

### Metáforas de Obra (OBRIGATÓRIO quando aplicável)
- Use metáforas de OBRA, PROJETO, FUNDAÇÃO, EXECUÇÃO ou DETALHE
- Mostre causa e consequência como em uma obra mal planejada
- Traduza abstrações em situações concretas do canteiro ou da gestão
- Exemplos: "Negócio sem método é obra sem projeto", "Você não começa obra pelo telhado"

### Estrutura Invisível
1. Espelhar a dor real SEM dramatizar
2. Nomear o problema como falta de MÉTODO, não de esforço
3. Quebrar a crença operacional errada
4. **Mostrar a consequência PRÁTICA de não decidir** (CRÍTICO!)
5. Apresentar o método como proteção e clareza
6. Convidar para decisão CONSCIENTE
7. Devolver responsabilidade SEM agressividade

### Linguagem
- Frases curtas (12-15 palavras em média)
- Parágrafos pequenos (máximo 4 linhas)
- Sem travessão (—)
- Máximo 2 emojis
- Sem jargões de marketing
- Use palavras-chave: método, clareza, direção, estrutura, decisão, liberdade

### Urgência por Custo Invisível
- Custo acumulado da indecisão
- "Juros" emocionais e financeiros
- Retrabalho futuro
- Tempo perdido que não volta
- Frase modelo: "Quem adia decisão paga duas vezes"
- NUNCA: contagem regressiva vazia, pressão emocional artificial

### Emoções
- Foco em ALÍVIO, não euforia
- Validar dores reais: cansaço, frustração, busca por clareza
- Sempre conduzir para ação, nunca para "colo"

### NÃO É BORAnaOBRA SE:
- Parece motivacional sem método
- Promete resultado sem custo ou escolha
- Trata o leitor como vítima do mercado
- Usa frases genéricas que servem qualquer nicho
- Poderia ser dita por um guru genérico

### Português
- Ortografia correta
- Concordância verbal e nominal
- Pontuação adequada

### Branding
- A marca é SEMPRE escrita como: BORAnaOBRA
- NUNCA: boranaobra, BORANAOBRA, Bora na Obra, etc.

Reescreva o texto aplicando TODAS as correções sugeridas, INCLUINDO metáforas de obra quando possível, e SEMPRE mostrando a consequência de não agir.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texto, problemas, sugestoes } = await req.json();

    if (!texto || typeof texto !== "string") {
      return new Response(
        JSON.stringify({ error: "Texto é obrigatório" }),
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

    const problemasFormatados = problemas?.map((p: any) => 
      `- Trecho: "${p.trecho_original}"\n  Problema: ${p.problema}\n  Sugestão: ${p.sugestao_reescrita}`
    ).join("\n\n") || "Nenhum problema específico identificado.";

    const sugestoesFormatadas = sugestoes?.join("\n- ") || "Nenhuma sugestão adicional.";

    const userPrompt = `Reescreva a copy abaixo no estilo BORAnaOBRA "Rafa + Alex", corrigindo todos os problemas:

## COPY ORIGINAL
${texto}

## PROBLEMAS IDENTIFICADOS
${problemasFormatados}

## SUGESTÕES DE MELHORIA
- ${sugestoesFormatadas}

## INSTRUÇÕES CRÍTICAS
1. Mantenha a estrutura e intenção original
2. Aplique TODAS as correções sugeridas
3. INCLUA metáforas de obra/projeto/fundação quando possível
4. MOSTRE a consequência de não decidir (custo invisível)
5. Use tom de EMPATIA COM DIREÇÃO (não "colo" motivacional)
6. Corrija erros de português
7. Formate para mobile (frases curtas, parágrafos pequenos)
8. Retorne APENAS a nova copy, sem explicações`;

    console.log("Calling Lovable AI for copy rewrite (Rafa+Alex style)...");

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
              name: "rewrite_copy",
              description: "Retorna a copy reescrita no estilo BORAnaOBRA",
              parameters: {
                type: "object",
                properties: {
                  nova_copy: {
                    type: "string",
                    description: "O texto reescrito seguindo as diretrizes BORAnaOBRA estilo Rafa+Alex"
                  }
                },
                required: ["nova_copy"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "rewrite_copy" } }
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
        JSON.stringify({ error: "Erro ao processar reescrita" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "rewrite_copy") {
      console.error("Unexpected AI response format:", JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: "Formato de resposta inesperado da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Rewrite complete (Rafa+Alex style)");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in rewrite-copy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
