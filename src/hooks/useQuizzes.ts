import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Quiz {
  id: string;
  created_by: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "paused";
  intro_title: string | null;
  intro_subtitle: string | null;
  intro_text: string | null;
  intro_image_url: string | null;
  intro_video_url: string | null;
  intro_cta_text: string | null;
  show_progress_bar: boolean;
  privacy_text: string | null;
  lead_capture_enabled: boolean;
  lead_capture_position: "before_result" | "after_result";
  lead_fields: string[];
  lead_required_fields: string[];
  lgpd_consent_text: string | null;
  primary_color: string;
  background_color: string;
  diagnosis_type: "score" | "tags" | "ai";
  ai_prompt_template: string | null;
  final_cta_text: string | null;
  final_cta_url: string | null;
  final_cta_whatsapp: string | null;
  views_count: number;
  starts_count: number;
  completions_count: number;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "scale" | "text" | "number" | "url" | "yes_no" | "content" | "testimonial" | "divider";
  helper_text: string | null;
  image_url: string | null;
  video_url: string | null;
  is_required: boolean;
  position: number;
  scale_min: number;
  scale_max: number;
  scale_min_label: string | null;
  scale_max_label: string | null;
  scoring_axis: string;
  // Content block fields
  content_title: string | null;
  content_body: string | null;
  content_author_name: string | null;
  content_author_role: string | null;
  content_author_image: string | null;
  created_at: string;
  updated_at: string;
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  image_url: string | null;
  position: number;
  points: number;
  tags: string[];
  scoring_values: Record<string, number>;
  jump_to_question_id: string | null;
  jump_to_diagnosis_id: string | null;
  created_at: string;
}

export interface QuizDiagnosis {
  id: string;
  quiz_id: string;
  min_score: number | null;
  max_score: number | null;
  required_tags: string[];
  scoring_axis: string;
  title: string;
  description: string | null;
  insights: string[];
  action_plan: string | null;
  icon: string | null;
  color: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  status: "started" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
  total_score: number;
  scores_by_axis: Record<string, number>;
  collected_tags: string[];
  diagnosis_id: string | null;
  ai_generated_diagnosis: string | null;
  device_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

export interface QuizLead {
  id: string;
  session_id: string;
  quiz_id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  custom_fields: Record<string, string>;
  lgpd_consent: boolean;
  created_at: string;
}

// Generate unique slug
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
}

// Fetch all quizzes with creator info
export function useQuizzes() {
  return useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          profiles:created_by(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (Quiz & { profiles: { full_name: string } | null })[];
    },
  });
}

// Fetch single quiz with questions
export function useQuiz(id: string | undefined) {
  return useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      if (!id) return null;

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();

      if (quizError) throw quizError;

      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*, quiz_options(*)")
        .eq("quiz_id", id)
        .order("position");

      if (questionsError) throw questionsError;

      const { data: diagnoses, error: diagnosesError } = await supabase
        .from("quiz_diagnoses")
        .select("*")
        .eq("quiz_id", id)
        .order("priority");

      if (diagnosesError) throw diagnosesError;

      return {
        ...quiz,
        questions: questions.map((q: any) => ({
          ...q,
          options: q.quiz_options || [],
        })),
        diagnoses,
      } as Quiz & { questions: QuizQuestion[]; diagnoses: QuizDiagnosis[] };
    },
    enabled: !!id,
  });
}

// Fetch quiz by slug (for public page)
export function useQuizBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["quiz-slug", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (quizError) throw quizError;

      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*, quiz_options(*)")
        .eq("quiz_id", quiz.id)
        .order("position");

      if (questionsError) throw questionsError;

      const { data: diagnoses, error: diagnosesError } = await supabase
        .from("quiz_diagnoses")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("priority");

      if (diagnosesError) throw diagnosesError;

      // Increment view count
      await supabase
        .from("quizzes")
        .update({ views_count: (quiz.views_count || 0) + 1 })
        .eq("id", quiz.id);

      return {
        ...quiz,
        questions: questions.map((q: any) => ({
          ...q,
          options: q.quiz_options || [],
        })),
        diagnoses,
      } as Quiz & { questions: QuizQuestion[]; diagnoses: QuizDiagnosis[] };
    },
    enabled: !!slug,
  });
}

// Create quiz
export function useCreateQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const slug = generateSlug(data.title);

      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({
          title: data.title,
          description: data.description || null,
          slug,
          created_by: user.user.id,
          intro_title: data.title,
        })
        .select()
        .single();

      if (error) throw error;
      return quiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({ title: "Quiz criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar quiz", description: error.message, variant: "destructive" });
    },
  });
}

// Update quiz
export function useUpdateQuiz(showToast = true) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Quiz> & { id: string }) => {
      const { error } = await supabase
        .from("quizzes")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.id] });
      if (showToast) {
        toast({ title: "Quiz atualizado!" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar quiz", description: error.message, variant: "destructive" });
    },
  });
}

// Duplicate quiz with all questions, options, and diagnoses
export function useDuplicateQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quizId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      // Get original quiz
      const { data: originalQuiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;

      // Get questions with options
      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*, quiz_options(*)")
        .eq("quiz_id", quizId)
        .order("position");

      if (questionsError) throw questionsError;

      // Get diagnoses
      const { data: diagnoses, error: diagnosesError } = await supabase
        .from("quiz_diagnoses")
        .select("*")
        .eq("quiz_id", quizId);

      if (diagnosesError) throw diagnosesError;

      // Create new quiz
      const newSlug = generateSlug(`${originalQuiz.title} (cópia)`);
      const { data: newQuiz, error: newQuizError } = await supabase
        .from("quizzes")
        .insert({
          title: `${originalQuiz.title} (cópia)`,
          description: originalQuiz.description,
          slug: newSlug,
          created_by: user.user.id,
          status: "draft",
          intro_title: originalQuiz.intro_title,
          intro_subtitle: originalQuiz.intro_subtitle,
          intro_text: originalQuiz.intro_text,
          intro_image_url: originalQuiz.intro_image_url,
          intro_video_url: originalQuiz.intro_video_url,
          intro_cta_text: originalQuiz.intro_cta_text,
          show_progress_bar: originalQuiz.show_progress_bar,
          privacy_text: originalQuiz.privacy_text,
          lead_capture_enabled: originalQuiz.lead_capture_enabled,
          lead_capture_position: originalQuiz.lead_capture_position,
          lead_fields: originalQuiz.lead_fields,
          lead_required_fields: originalQuiz.lead_required_fields,
          lgpd_consent_text: originalQuiz.lgpd_consent_text,
          primary_color: originalQuiz.primary_color,
          background_color: originalQuiz.background_color,
          diagnosis_type: originalQuiz.diagnosis_type,
          ai_prompt_template: originalQuiz.ai_prompt_template,
          final_cta_text: originalQuiz.final_cta_text,
          final_cta_url: originalQuiz.final_cta_url,
        })
        .select()
        .single();

      if (newQuizError) throw newQuizError;

      // Duplicate questions and options
      for (const question of questions || []) {
        const { quiz_options, id: oldQuestionId, quiz_id: _, created_at: __, updated_at: ___, ...questionData } = question;

        const { data: newQuestion, error: newQuestionError } = await supabase
          .from("quiz_questions")
          .insert({
            ...questionData,
            quiz_id: newQuiz.id,
          })
          .select()
          .single();

        if (newQuestionError) throw newQuestionError;

        // Duplicate options
        if (quiz_options && quiz_options.length > 0) {
          const optionsToInsert = quiz_options.map((opt: any) => ({
            question_id: newQuestion.id,
            option_text: opt.option_text,
            image_url: opt.image_url,
            position: opt.position,
            points: opt.points,
            tags: opt.tags,
            scoring_values: opt.scoring_values,
          }));

          const { error: optionsError } = await supabase
            .from("quiz_options")
            .insert(optionsToInsert);

          if (optionsError) throw optionsError;
        }
      }

      // Duplicate diagnoses
      if (diagnoses && diagnoses.length > 0) {
        const diagnosesToInsert = diagnoses.map((d: any) => ({
          quiz_id: newQuiz.id,
          min_score: d.min_score,
          max_score: d.max_score,
          required_tags: d.required_tags,
          scoring_axis: d.scoring_axis,
          title: d.title,
          description: d.description,
          insights: d.insights,
          action_plan: d.action_plan,
          icon: d.icon,
          color: d.color,
          priority: d.priority,
        }));

        const { error: diagnosesInsertError } = await supabase
          .from("quiz_diagnoses")
          .insert(diagnosesToInsert);

        if (diagnosesInsertError) throw diagnosesInsertError;
      }

      return newQuiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({ title: "Quiz duplicado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao duplicar quiz", description: error.message, variant: "destructive" });
    },
  });
}

// Delete quiz
export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({ title: "Quiz excluído!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir quiz", description: error.message, variant: "destructive" });
    },
  });
}

// Question CRUD
export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      quiz_id: string; 
      question_text: string; 
      question_type?: string; 
      position?: number; 
      is_required?: boolean;
      image_url?: string;
      video_url?: string;
      content_title?: string;
      content_body?: string;
      content_author_name?: string;
      content_author_role?: string;
      content_author_image?: string;
    }) => {
      const { data: question, error } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: data.quiz_id,
          question_text: data.question_text,
          question_type: data.question_type || "single_choice",
          position: data.position || 0,
          is_required: data.is_required ?? true,
          image_url: data.image_url,
          video_url: data.video_url,
          content_title: data.content_title,
          content_body: data.content_body,
          content_author_name: data.content_author_name,
          content_author_role: data.content_author_role,
          content_author_image: data.content_author_image,
        })
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.quiz_id] });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quiz_id, ...data }: Partial<QuizQuestion> & { id: string; quiz_id: string }) => {
      const { error } = await supabase
        .from("quiz_questions")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.quiz_id] });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quiz_id }: { id: string; quiz_id: string }) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.quiz_id] });
    },
  });
}

// Reorder questions
export function useReorderQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quizId, questionIds }: { quizId: string; questionIds: string[] }) => {
      // Update all positions in parallel
      const updates = questionIds.map((id, index) =>
        supabase
          .from("quiz_questions")
          .update({ position: index })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      return quizId;
    },
    onSuccess: (quizId) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
}

// Duplicate question with all options
export function useDuplicateQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ questionId, quizId }: { questionId: string; quizId: string }) => {
      // Get original question with options
      const { data: originalQuestion, error: questionError } = await supabase
        .from("quiz_questions")
        .select("*, quiz_options(*)")
        .eq("id", questionId)
        .single();

      if (questionError) throw questionError;

      // Get max position to place the duplicate after
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("position")
        .eq("quiz_id", quizId)
        .order("position", { ascending: false })
        .limit(1);

      const newPosition = (questions?.[0]?.position ?? 0) + 1;

      // Create duplicated question
      const { quiz_options, id: _, quiz_id: __, created_at: ___, updated_at: ____, ...questionData } = originalQuestion;

      const { data: newQuestion, error: newQuestionError } = await supabase
        .from("quiz_questions")
        .insert({
          ...questionData,
          quiz_id: quizId,
          question_text: `${questionData.question_text} (cópia)`,
          position: newPosition,
        })
        .select()
        .single();

      if (newQuestionError) throw newQuestionError;

      // Duplicate options if any
      if (quiz_options && quiz_options.length > 0) {
        const optionsToInsert = quiz_options.map((opt: any) => ({
          question_id: newQuestion.id,
          option_text: opt.option_text,
          image_url: opt.image_url,
          position: opt.position,
          points: opt.points,
          tags: opt.tags,
          scoring_values: opt.scoring_values,
        }));

        const { error: optionsError } = await supabase
          .from("quiz_options")
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      return { newQuestion, quizId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", result.quizId] });
      toast({ title: "Pergunta duplicada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao duplicar pergunta", description: error.message, variant: "destructive" });
    },
  });
}

// Option CRUD
export function useCreateOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { question_id: string; quiz_id: string; option_text: string; position?: number; points?: number }) => {
      const { quiz_id, ...optionData } = data;
      const { data: option, error } = await supabase
        .from("quiz_options")
        .insert({
          question_id: optionData.question_id,
          option_text: optionData.option_text,
          position: optionData.position || 0,
          points: optionData.points || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return { option, quiz_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", result.quiz_id] });
    },
  });
}

export function useUpdateOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quiz_id, ...data }: Partial<QuizOption> & { id: string; quiz_id: string }) => {
      const { error } = await supabase
        .from("quiz_options")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return quiz_id;
    },
    onSuccess: (quiz_id) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quiz_id] });
    },
  });
}

export function useDeleteOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quiz_id }: { id: string; quiz_id: string }) => {
      const { error } = await supabase.from("quiz_options").delete().eq("id", id);
      if (error) throw error;
      return quiz_id;
    },
    onSuccess: (quiz_id) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quiz_id] });
    },
  });
}

// Diagnosis CRUD
export function useCreateDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { quiz_id: string; title: string; min_score?: number; max_score?: number }) => {
      const { data: diagnosis, error } = await supabase
        .from("quiz_diagnoses")
        .insert({
          quiz_id: data.quiz_id,
          title: data.title,
          min_score: data.min_score,
          max_score: data.max_score,
        })
        .select()
        .single();

      if (error) throw error;
      return diagnosis;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.quiz_id] });
    },
  });
}

export function useUpdateDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quiz_id, ...data }: Partial<QuizDiagnosis> & { id: string; quiz_id: string }) => {
      const { error } = await supabase
        .from("quiz_diagnoses")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.quiz_id] });
    },
  });
}

export function useDeleteDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quiz_id }: { id: string; quiz_id: string }) => {
      const { error } = await supabase.from("quiz_diagnoses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz", variables.quiz_id] });
    },
  });
}

// Session and response management (for public quiz)
export function useCreateSession() {
  return useMutation({
    mutationFn: async (data: { quiz_id: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }) => {
      const { data: session, error } = await supabase
        .from("quiz_sessions")
        .insert({
          quiz_id: data.quiz_id,
          utm_source: data.utm_source,
          utm_medium: data.utm_medium,
          utm_campaign: data.utm_campaign,
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
        })
        .select()
        .single();

      if (error) throw error;

      // Increment starts count
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("starts_count")
        .eq("id", data.quiz_id)
        .single();
      
      if (quizData) {
        await supabase
          .from("quizzes")
          .update({ starts_count: (quizData.starts_count || 0) + 1 })
          .eq("id", data.quiz_id);
      }

      return session;
    },
  });
}

export function useSubmitResponse() {
  return useMutation({
    mutationFn: async (data: {
      session_id: string;
      question_id: string;
      selected_option_ids?: string[];
      text_response?: string;
      number_response?: number;
      scale_response?: number;
      points_earned?: number;
      tags_collected?: string[];
      time_spent_seconds?: number;
    }) => {
      const { data: response, error } = await supabase
        .from("quiz_responses")
        .insert({
          session_id: data.session_id,
          question_id: data.question_id,
          selected_option_ids: data.selected_option_ids || [],
          text_response: data.text_response,
          number_response: data.number_response,
          scale_response: data.scale_response,
          points_earned: data.points_earned || 0,
          tags_collected: data.tags_collected || [],
          time_spent_seconds: data.time_spent_seconds,
        })
        .select()
        .single();

      if (error) throw error;
      return response;
    },
  });
}

export function useCompleteSession() {
  return useMutation({
    mutationFn: async (data: {
      session_id: string;
      quiz_id: string;
      total_score: number;
      scores_by_axis: Record<string, number>;
      collected_tags: string[];
      diagnosis_id?: string;
      ai_generated_diagnosis?: string;
    }) => {
      const { error } = await supabase
        .from("quiz_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_score: data.total_score,
          scores_by_axis: data.scores_by_axis,
          collected_tags: data.collected_tags,
          diagnosis_id: data.diagnosis_id,
          ai_generated_diagnosis: data.ai_generated_diagnosis,
        })
        .eq("id", data.session_id);

      if (error) throw error;

      // Increment completions count
      await supabase
        .from("quizzes")
        .select("completions_count")
        .eq("id", data.quiz_id)
        .single()
        .then(({ data: quiz }) => {
          if (quiz) {
            supabase
              .from("quizzes")
              .update({ completions_count: (quiz.completions_count || 0) + 1 })
              .eq("id", data.quiz_id);
          }
        });
    },
  });
}

export function useSubmitLead() {
  return useMutation({
    mutationFn: async (data: Partial<QuizLead> & { session_id: string; quiz_id: string }) => {
      const { data: lead, error } = await supabase
        .from("quiz_leads")
        .insert({
          session_id: data.session_id,
          quiz_id: data.quiz_id,
          name: data.name,
          email: data.email,
          whatsapp: data.whatsapp,
          company: data.company,
          city: data.city,
          state: data.state,
          custom_fields: data.custom_fields || {},
          lgpd_consent: data.lgpd_consent || false,
          consent_timestamp: data.lgpd_consent ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment leads count
      await supabase
        .from("quizzes")
        .select("leads_count")
        .eq("id", data.quiz_id)
        .single()
        .then(({ data: quiz }) => {
          if (quiz) {
            supabase
              .from("quizzes")
              .update({ leads_count: (quiz.leads_count || 0) + 1 })
              .eq("id", data.quiz_id);
          }
        });

      return lead;
    },
  });
}

// Analytics with real data
export function useQuizAnalytics(quizId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-analytics", quizId],
    queryFn: async () => {
      if (!quizId) return null;

      const { data: sessions, error: sessionsError } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("started_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      const { data: leads, error: leadsError } = await supabase
        .from("quiz_leads")
        .select("*")
        .eq("quiz_id", quizId)
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch responses with question text for download
      const { data: responses, error: responsesError } = await supabase
        .from("quiz_responses")
        .select(`
          *,
          quiz_sessions!inner(quiz_id, completed_at, total_score),
          quiz_questions!inner(question_text, question_type)
        `)
        .eq("quiz_sessions.quiz_id", quizId);

      if (responsesError) throw responsesError;

      // Calculate real stats from data
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter((s) => s.status === "completed").length;
      const totalLeads = leads.length;

      return {
        sessions: sessions as QuizSession[],
        leads: leads as QuizLead[],
        responses,
        stats: {
          totalSessions,
          completedSessions,
          totalLeads,
          completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
          optInRate: completedSessions > 0 ? (totalLeads / completedSessions) * 100 : 0,
        },
      };
    },
    enabled: !!quizId,
  });
}

// Generate quiz from AI prompt
export function useGenerateQuizFromAI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prompt: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("generate-quiz-from-ai", {
        body: { prompt, user_id: user.user.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.quiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({ title: "Quiz gerado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao gerar quiz", description: error.message, variant: "destructive" });
    },
  });
}
