import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é um analisador de copy especializado na metodologia e tom de voz da marca BORAnaOBRA, alinhado 100% com o estilo "Rafa + Alex".

Sua função é avaliar textos de marketing e vendas seguindo rigorosamente as diretrizes da marca, fornecendo uma pontuação objetiva e feedback acionável.

## CONTEXTO DA MARCA

O BORAnaOBRA atende arquitetos e engenheiros que buscam transformar conhecimento técnico em negócios lucrativos. A comunicação é direta, madura, profissional e empática COM DIREÇÃO — nunca "colo" motivacional.

## TOM E VOZ ESPERADOS
- Direto, maduro, calmo, seguro
- Profissional e humano
- Confiante sem arrogância
- Empatia COM DIREÇÃO: acolhe a dor, MAS conduz para decisão
- Nunca valida a permanência no erro
- NUNCA: guru, agressivo, apelativo, infantilizador, motivacional vazio

## METÁFORAS OBRIGATÓRIAS (quando aplicável)

O texto deve, sempre que possível:
- Usar metáforas de OBRA, PROJETO, FUNDAÇÃO, EXECUÇÃO ou DETALHE
- Mostrar causa e consequência como em uma obra mal planejada
- Traduzir abstrações em situações concretas do canteiro ou da gestão

Critério de nota para dimensão "Metáforas de Obra":
- 0-30 se não houver nenhuma analogia concreta do universo da construção
- 40-60 se houver analogia genérica ou superficial
- 70-100 se a metáfora sustentar o raciocínio inteiro e criar clareza

Exemplos de metáforas BORAnaOBRA:
- "Você não começa uma obra pelo telhado"
- "Negócio sem método é obra sem projeto: custa mais caro e demora mais"
- "A fundação do seu negócio precisa aguentar o peso do crescimento"
- "Quem executa sem planejamento faz retrabalho"

## SINAIS DE ALERTA | NÃO É BORAnaOBRA SE O TEXTO:

Identifique e liste TODOS os sinais de alerta encontrados:

1. Parece motivacional sem método (frases de efeito vazias)
2. Promete resultado sem custo ou escolha (mágica)
3. Trata o leitor como vítima do mercado (vitimização)
4. Usa frases que poderiam servir para qualquer nicho (genérico)
5. Poderia ser dita por um guru genérico (coachismo)
6. Usa linguagem de marketing digital explícita
7. Foca em euforia ao invés de alívio
8. Não responsabiliza o leitor pela própria decisão

Cada sinal encontrado DEVE ser listado em "sinais_alerta" com o trecho específico.

## EMOÇÕES TRABALHADAS
- Cansaço, frustração silenciosa, sensação de estar atrasado
- Medo de continuar no mesmo ponto
- Desejo de clareza e segurança
- Foco em ALÍVIO, não euforia
- Validar dores reais, MAS sempre conduzir para ação

## ESTRUTURA INVISÍVEL ESPERADA (refinada)

1. Espelhar a dor real do leitor SEM dramatizar
2. Nomear o problema como falta de MÉTODO, não de esforço
3. Quebrar a crença operacional errada
4. **Mostrar a consequência PRÁTICA de não decidir** (custo invisível)
5. Apresentar o método como proteção e clareza
6. Convidar para uma decisão CONSCIENTE
7. Devolver responsabilidade ao leitor SEM agressividade

O passo 4 é CRÍTICO e frequentemente ausente. A copy BORAnaOBRA sempre mostra o preço de não agir.

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

Se encontrar qualquer variação incorreta, marcar como erro CRÍTICO.

## PROVA SOCIAL (quando presente)
- Humana e contextualizada
- Com antes/durante/depois
- Sem ostentação
- Foco em transformação pessoal, não em números

## URGÊNCIA BORAnaOBRA

Baseada em CUSTO INVISÍVEL:
- Custo acumulado da indecisão
- "Juros" emocionais e financeiros
- Retrabalho futuro
- Tempo perdido que não volta

Frases exemplo: "Quem adia decisão paga duas vezes"

❌ EVITAR:
- Contagem regressiva vazia
- Pressão emocional artificial
- "Últimas vagas" sem contexto
- Desespero ou manipulação

## TRATAMENTO DE LINKS

IMPORTANTE: Ao analisar o texto, IGNORE completamente qualquer URL ou link.
- Não avalie links como parte do texto
- Não penalize termos dentro de URLs
- Foque APENAS no texto que não é URL

## SUA TAREFA

Avalie o texto fornecido em 9 dimensões:

1. **Tom e Voz** (peso 18%) - Empatia com direção, maduro, sem guru
2. **Metáforas de Obra** (peso 12%) - Uso de analogias de construção/projeto
3. **Emoções Trabalhadas** (peso 12%) - Alívio, não euforia
4. **Estrutura Invisível** (peso 18%) - Os 7 passos, especialmente consequência
5. **Restrições de Linguagem** (peso 15%) - Sem jargões, frases curtas
6. **Português e Gramática** (peso 10%) - Ortografia, concordância, pontuação
7. **Prova Social** (peso 5%, ou N/A) - Humanizada, com transformação
8. **Urgência** (peso 5%, ou N/A) - Por custo invisível, não desespero
9. **Formato e Legibilidade** (peso 5%) - Mobile-first, respirável

Para dimensões N/A, redistribua o peso proporcionalmente.

OBRIGATÓRIO no output:
- ajuste_prioritario: O ÚNICO problema mais crítico a resolver primeiro
- exemplo_reescrito: UMA frase do texto original reescrita no tom BORA
- sinais_alerta: Lista de todos os sinais de alerta encontrados

Seja preciso, objetivo e acionável.`;

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

    const userPrompt = `Analise a copy abaixo seguindo RIGOROSAMENTE as diretrizes BORAnaOBRA estilo "Rafa + Alex":

---
${texto}
---

Forneça:
1. Pontuação geral (0-100)
2. Avaliação detalhada de cada uma das 9 dimensões
3. AJUSTE PRIORITÁRIO: O problema mais crítico a resolver primeiro
4. EXEMPLO REESCRITO: Uma frase do texto reescrita no tom BORA
5. SINAIS DE ALERTA: Todos os sinais de "não é BORA" encontrados
6. Trechos problemáticos com citações literais e sugestões`;

    console.log("Calling Lovable AI for copy validation (Rafa+Alex style)...");

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
              description: "Retorna a análise estruturada da copy no padrão BORAnaOBRA",
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
                    description: "Status: 90-100=Aprovado, 75-89=Ajustes Recomendados, 60-74=Necessita Revisão, 0-59=Não Aprovado"
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
                  resumo_executivo: { type: "string" },
                  ajuste_prioritario: {
                    type: "string",
                    description: "O ÚNICO problema mais crítico a resolver primeiro"
                  },
                  exemplo_reescrito: {
                    type: "object",
                    properties: {
                      original: { type: "string", description: "Frase original do texto" },
                      reescrito: { type: "string", description: "Mesma frase reescrita no tom BORA" }
                    },
                    required: ["original", "reescrito"]
                  },
                  sinais_alerta: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de sinais de que o texto NÃO é BORAnaOBRA"
                  }
                },
                required: ["pontuacao_geral", "status", "dimensoes", "destaques_positivos", "trechos_problematicos", "resumo_executivo", "ajuste_prioritario", "exemplo_reescrito", "sinais_alerta"]
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
