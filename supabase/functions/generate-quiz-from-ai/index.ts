import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, user_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const systemPrompt = `Você é um especialista em criação de quizzes interativos e diagnósticos.
O usuário vai te dar um tema/objetivo e você deve criar um quiz completo estruturado.

RESPONDA APENAS COM JSON VÁLIDO, sem markdown, sem explicações.

Estrutura obrigatória do JSON:
{
  "title": "Título do quiz",
  "description": "Descrição breve do quiz",
  "intro_title": "Título da página de introdução",
  "intro_subtitle": "Subtítulo",
  "intro_text": "Texto explicativo sobre o quiz",
  "intro_cta_text": "Texto do botão de iniciar",
  "questions": [
    {
      "question_text": "Texto da pergunta",
      "question_type": "single_choice", 
      "helper_text": "Texto de ajuda opcional",
      "is_required": true,
      "options": [
        {
          "option_text": "Texto da opção",
          "points": 10,
          "tags": ["tag1", "tag2"]
        }
      ]
    }
  ],
  "diagnoses": [
    {
      "title": "Título do diagnóstico",
      "description": "Descrição detalhada",
      "min_score": 0,
      "max_score": 30,
      "insights": ["Insight 1", "Insight 2"],
      "action_plan": "Plano de ação recomendado",
      "color": "#6366f1"
    }
  ],
  "diagnosis_type": "score",
  "primary_color": "#6366f1"
}

Tipos de perguntas disponíveis: single_choice, multiple_choice, scale, text, number, yes_no.
Gere entre 5-10 perguntas relevantes.
Gere 3-4 diagnósticos cobrindo diferentes faixas de pontuação.
Use cores vibrantes e diferentes para cada diagnóstico.`;

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
          { role: "user", content: `Crie um quiz completo sobre: ${prompt}` },
        ],
        max_tokens: 4000,
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
    let quizContent = data.choices?.[0]?.message?.content || "";

    // Clean up markdown if present
    quizContent = quizContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let quizData;
    try {
      quizData = JSON.parse(quizContent);
    } catch (e) {
      console.error("Failed to parse AI response:", quizContent);
      throw new Error("Failed to parse AI generated quiz");
    }

    // Generate unique slug
    const baseSlug = quizData.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${randomSuffix}`;

    // Create the quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: quizData.title,
        slug,
        description: quizData.description,
        created_by: user_id,
        intro_title: quizData.intro_title || quizData.title,
        intro_subtitle: quizData.intro_subtitle,
        intro_text: quizData.intro_text,
        intro_cta_text: quizData.intro_cta_text || "Começar diagnóstico",
        diagnosis_type: quizData.diagnosis_type || "score",
        primary_color: quizData.primary_color || "#6366f1",
        status: "draft",
      })
      .select()
      .single();

    if (quizError) {
      console.error("Quiz creation error:", quizError);
      throw new Error("Failed to create quiz in database");
    }

    // Create questions and options
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      
      const { data: question, error: questionError } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quiz.id,
          question_text: q.question_text,
          question_type: q.question_type || "single_choice",
          helper_text: q.helper_text,
          is_required: q.is_required ?? true,
          position: i,
        })
        .select()
        .single();

      if (questionError) {
        console.error("Question creation error:", questionError);
        continue;
      }

      // Create options if present
      if (q.options && Array.isArray(q.options)) {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          await supabase.from("quiz_options").insert({
            question_id: question.id,
            option_text: opt.option_text,
            points: opt.points || 0,
            tags: opt.tags || [],
            position: j,
          });
        }
      }
    }

    // Create diagnoses
    for (let i = 0; i < quizData.diagnoses.length; i++) {
      const d = quizData.diagnoses[i];
      await supabase.from("quiz_diagnoses").insert({
        quiz_id: quiz.id,
        title: d.title,
        description: d.description,
        min_score: d.min_score,
        max_score: d.max_score,
        insights: d.insights || [],
        action_plan: d.action_plan,
        color: d.color || "#6366f1",
        priority: i,
      });
    }

    console.log("Quiz created successfully:", quiz.id);

    return new Response(JSON.stringify({ quiz }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
