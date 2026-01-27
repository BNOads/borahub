import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é um analisador de copy especializado na metodologia e tom de voz da marca BORAnaOBRA.

Sua função é avaliar textos de marketing e vendas seguindo rigorosamente as diretrizes da marca, fornecendo uma pontuação objetiva e feedback acionável.

## CONTEXTO DA MARCA

O BORAnaOBRA atende arquitetos e engenheiros que buscam transformar conhecimento técnico em negócios lucrativos. A comunicação é direta, madura, profissional e empática, sem apelação ou infantilização.

## TOM E VOZ ESPERADOS
- Direto, maduro, calmo, seguro
- Profissional e humano
- Confiante sem arrogância
- NUNCA: guru, agressivo, apelativo, infantilizador

## EMOÇÕES TRABALHADAS
- Cansaço, frustração silenciosa, sensação de estar atrasado
- Medo de continuar no mesmo ponto
- Desejo de clareza e segurança
- Foco em ALÍVIO, não euforia

## ESTRUTURA INVISÍVEL ESPERADA
1. Espelhar a dor real do leitor
2. Nomear o problema com clareza
3. Quebrar a crença errada
4. Apresentar o método como caminho
5. Usar prova humana ou lógica clara
6. Convidar para decisão consciente
7. Devolver responsabilidade ao leitor

## RESTRIÇÕES DE LINGUAGEM

❌ NUNCA:
- Travessão (—)
- Mais de 2 emojis
- Linguagem técnica/acadêmica excessiva
- Jargões de marketing (ex: "solução disruptiva", "transformação digital")
- Ataques a faculdades ou concorrentes
- Mais de 3 usos de CAPS LOCK
- Mais de 1 exclamação por parágrafo
- TERMOS DE MARKETING DIGITAL (cada termo = penalização):
  - página, landing page, LP
  - carrinho, checkout
  - lançamento, lança, launch
  - abertura, abrir carrinho
  - click, clique, CTA
  - download, baixar (quando refere a material)
  - funil, topo de funil, fundo de funil
  - lead, leads, captura
  - tráfego, ads, anúncio
  - conversão, converter
  - copy, copywriting
  - gatilho, gatilho mental
  - escassez, urgência artificial
  - bônus, oferta, desconto
  - upsell, downsell, order bump
  - webinar, masterclass, imersão
  - método (quando usado de forma genérica sem contexto BORAnaOBRA)

✅ SEMPRE:
- Frases curtas (12-15 palavras em média)
- Parágrafos pequenos (máximo 4 linhas)
- Palavras-chave: método, clareza, direção, estrutura, decisão, liberdade
- Leitura vertical e respirável
- Pensado para mobile

## BRANDING OBRIGATÓRIO

A marca DEVE ser escrita EXATAMENTE como: BORAnaOBRA

❌ FORMAS INCORRETAS (penalizar severamente cada ocorrência):
- boranaobra (tudo minúsculo)
- BORANAOBRA (tudo maiúsculo)
- Boranaobra (capitalizado errado)
- Bora na Obra (separado)
- bora na obra (separado minúsculo)
- BORA NA OBRA (separado maiúsculo)
- BoraNoObra, BoraNaObra, boranobra (qualquer variação)

✅ FORMA CORRETA (única aceita):
- BORAnaOBRA

Se encontrar qualquer variação incorreta, marcar como erro CRÍTICO em "Trechos Problemáticos" e sugerir a correção para BORAnaOBRA.

## PROVA SOCIAL (quando presente)
- Humana e contextualizada
- Com antes/durante/depois
- Sem ostentação
- Foco em transformação pessoal

## URGÊNCIA
- Baseada em: consequência, fim de janela, decisão adiada
- NUNCA baseada em desespero ou manipulação

## SUA TAREFA

Avalie o texto fornecido em 8 dimensões, atribuindo pontos de 0 a 100 em cada:

1. **Tom e Voz** (peso 20%)
2. **Emoções Trabalhadas** (peso 15%)
3. **Estrutura Invisível** (peso 20%)
4. **Restrições de Linguagem** (peso 15%)
5. **Português e Gramática** (peso 10%) - Avalie ortografia, concordância, pontuação e clareza gramatical
6. **Prova Social** (peso 10%, se não houver prova social no texto, avalie como N/A e redistribua o peso)
7. **Urgência** (peso 5%, se não houver urgência no texto, avalie como N/A e redistribua o peso)
8. **Formato e Legibilidade** (peso 5%)

Para dimensões N/A, redistribua o peso proporcionalmente entre as outras dimensões.

Seja preciso, objetivo e acionável em todos os feedbacks.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texto } = await req.json();

    if (!texto || typeof texto !== "string") {
      return new Response(
        JSON.stringify({ error: "Texto é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (texto.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Texto excede o limite de 10.000 caracteres" }),
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

    const userPrompt = `Analise a copy abaixo seguindo as diretrizes BORAnaOBRA:

---
${texto}
---

Forneça:
1. Pontuação geral (0-100)
2. Avaliação detalhada de cada dimensão
3. Problemas identificados com citações literais
4. Sugestões acionáveis de melhoria
5. Exemplos de reescrita quando aplicável`;

    console.log("Calling Lovable AI for copy validation...");

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
              name: "validate_copy",
              description: "Retorna a análise estruturada da copy",
              parameters: {
                type: "object",
                properties: {
                  pontuacao_geral: {
                    type: "number",
                    description: "Pontuação geral de 0 a 100"
                  },
                  status: {
                    type: "string",
                    enum: ["Aprovado", "Ajustes Recomendados", "Necessita Revisão", "Não Aprovado"],
                    description: "Status baseado na pontuação: 90-100=Aprovado, 75-89=Ajustes Recomendados, 60-74=Necessita Revisão, 0-59=Não Aprovado"
                  },
                  dimensoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        pontuacao: { type: "number" },
                        peso: { type: "number" },
                        status: { type: "string", enum: ["Ótimo", "Atenção", "Crítico", "N/A"] },
                        problemas: { type: "array", items: { type: "string" } },
                        sugestoes: { type: "array", items: { type: "string" } },
                        exemplo_bora: { type: "string" }
                      },
                      required: ["nome", "pontuacao", "peso", "status", "problemas", "sugestoes"]
                    }
                  },
                  destaques_positivos: {
                    type: "array",
                    items: { type: "string" }
                  },
                  trechos_problematicos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        trecho_original: { type: "string" },
                        problema: { type: "string" },
                        sugestao_reescrita: { type: "string" }
                      },
                      required: ["trecho_original", "problema", "sugestao_reescrita"]
                    }
                  },
                  resumo_executivo: { type: "string" }
                },
                required: ["pontuacao_geral", "status", "dimensoes", "destaques_positivos", "trechos_problematicos", "resumo_executivo"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_copy" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar validação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "validate_copy") {
      console.error("Unexpected AI response format:", JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: "Formato de resposta inesperado da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = JSON.parse(toolCall.function.arguments);
    console.log("Validation complete, score:", validationResult.pontuacao_geral);

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in validate-copy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
