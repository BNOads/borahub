import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é um copywriter especializado na metodologia e tom de voz da marca BORAnaOBRA, estilo "Rafa + Alex".

Sua tarefa é CRIAR copies originais do zero para marketing, seguindo rigorosamente as diretrizes da marca.

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

### Estrutura Invisível (Os 7 Passos)
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
- Sem jargões de marketing digital (página, carrinho, lançamento, clique, leads, tráfego, conversão, gatilho, webinar, masterclass)
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
- NUNCA: boranaobra, BORANAOBRA, Bora na Obra, etc.`;

const CHANNEL_FORMATS: Record<string, string> = {
  email: `## FORMATO: E-MAIL
- Crie um ASSUNTO impactante (máximo 50 caracteres)
- Crie um SUBTÍTULO/PREHEADER (frase curta que aparece como preview do email, máximo 80 caracteres)
- Corpo estruturado com parágrafos curtos
- CTA claro ao final
- Retorne no formato:
ASSUNTO: [assunto aqui]
SUBTITULO: [subtítulo/preheader aqui]

[corpo do e-mail aqui]`,
  
  whatsapp_grupos: `## FORMATO: WHATSAPP GRUPOS
- Máximo 1000 caracteres
- CTAs claros e diretos
- Emojis moderados (máximo 3)
- Tom semi-formal mas próximo
- Sem links quebrados (use texto descritivo)`,
  
  whatsapp_1x1: `## FORMATO: WHATSAPP 1x1
- Tom pessoal e conversacional
- Como se falasse com um amigo
- Texto curto e direto
- Máximo 500 caracteres
- Pode usar nome do destinatário como [NOME]`,
  
  sms: `## FORMATO: SMS
- MÁXIMO 160 caracteres (obrigatório!)
- CTA único e direto
- Sem emoji
- Sem links longos
- Exemplo: "Sua obra precisa de método. Acesse [link] e organize sua gestão. BORAnaOBRA"`,
  
  audio: `## FORMATO: ROTEIRO DE ÁUDIO
- Roteiro coloquial para gravação
- Marque pausas com [PAUSA]
- Duração: 30-60 segundos de leitura
- Tom de conversa, não de locutor
- Estrutura: abertura → problema → solução → CTA`,
  
  conteudo: `## FORMATO: CONTEÚDO (POST/STORIES)
- Legenda envolvente
- 5-10 hashtags relevantes no final
- Estrutura: gancho → desenvolvimento → CTA
- Pode incluir sugestão de formato visual entre colchetes`
};

const STAGE_OBJECTIVES: Record<string, string> = {
  aquecimento: "Despertar consciência sobre o problema. Mostrar que o leitor está pagando um preço invisível por não ter método.",
  captacao: "Gerar interesse e capturar atenção. Fazer o leitor perceber que precisa de uma solução estruturada.",
  cpl_conteudo: "Entregar valor antecipado e construir autoridade. Mostrar que o método BORAnaOBRA funciona.",
  evento_aula: "Engajar durante o evento. Reforçar a transformação possível e preparar para a oferta.",
  abertura_carrinho: "Anunciar a oportunidade de compra. Criar urgência real baseada em custo de indecisão.",
  carrinho_aberto: "Manter o engajamento durante o período de vendas. Quebrar objeções e reforçar benefícios.",
  fechamento: "Última chamada. Urgência máxima baseada em consequências reais de não agir.",
  pos_venda: "Fortalecer relacionamento pós-compra. Reforçar decisão correta e gerar referências."
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      funnel_name, 
      funnel_category, 
      product_name, 
      funnel_stage, 
      channel,
      additional_context,
      scheduled_for
    } = await req.json();

    if (!channel || !funnel_stage) {
      return new Response(
        JSON.stringify({ error: "Canal e etapa do funil são obrigatórios" }),
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

    const stageKey = funnel_stage.toLowerCase().replace(/[\/\s]+/g, '_');
    const stageObjective = STAGE_OBJECTIVES[stageKey] || STAGE_OBJECTIVES.aquecimento;
    const channelFormat = CHANNEL_FORMATS[channel] || CHANNEL_FORMATS.email;

    const userPrompt = `Crie uma copy ORIGINAL seguindo todas as diretrizes BORAnaOBRA "Rafa + Alex".

## CONTEXTO DO FUNIL
- Funil: ${funnel_name || "Não especificado"}
- Categoria: ${funnel_category || "Lançamento"}
- Produto: ${product_name || "Produto BORAnaOBRA"}
- Etapa: ${funnel_stage}
${scheduled_for ? `- Data de envio: ${scheduled_for}` : ''}

## OBJETIVO DA ETAPA
${stageObjective}

${channelFormat}

${additional_context ? `## CONTEXTO ADICIONAL DO USUÁRIO
${additional_context}` : ''}

## LEMBRE-SE
1. Siga os 7 passos da estrutura invisível
2. Use pelo menos 2 metáforas de obra
3. Mostre o custo de não decidir
4. Sem jargões de marketing digital
5. Máximo 2 emojis
6. Marca sempre como BORAnaOBRA
7. Adapte o tom ao canal (${channel})

Retorne APENAS a copy, sem explicações.`;

    console.log(`Generating copy for channel: ${channel}, stage: ${funnel_stage}`);

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
              name: "generate_copy",
              description: "Retorna a copy gerada no estilo BORAnaOBRA",
              parameters: {
                type: "object",
                properties: {
                  copy: {
                    type: "string",
                    description: "O texto da copy criado seguindo as diretrizes BORAnaOBRA"
                  },
                  suggested_name: {
                    type: "string",
                    description: "Nome sugerido para a copy (ex: 'E-mail Aquecimento D-7')"
                  }
                },
                required: ["copy", "suggested_name"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_copy" } }
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
        JSON.stringify({ error: "Erro ao gerar copy" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "generate_copy") {
      console.error("Unexpected AI response format:", JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: "Formato de resposta inesperado da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Copy generated successfully");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-copy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
