-- =====================================================
-- QUIZ MODULE - Database Schema
-- =====================================================

-- Main quiz table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused')),
  
  -- Intro page settings
  intro_title TEXT,
  intro_subtitle TEXT,
  intro_text TEXT,
  intro_image_url TEXT,
  intro_video_url TEXT,
  intro_cta_text TEXT DEFAULT 'Começar diagnóstico',
  show_progress_bar BOOLEAN DEFAULT true,
  privacy_text TEXT,
  
  -- Lead capture settings
  lead_capture_enabled BOOLEAN DEFAULT true,
  lead_capture_position TEXT DEFAULT 'before_result' CHECK (lead_capture_position IN ('before_result', 'after_result')),
  lead_fields JSONB DEFAULT '["name", "email", "whatsapp"]'::jsonb,
  lead_required_fields JSONB DEFAULT '["email"]'::jsonb,
  lgpd_consent_text TEXT DEFAULT 'Concordo com a política de privacidade',
  
  -- Styling
  primary_color TEXT DEFAULT '#6366f1',
  background_color TEXT DEFAULT '#ffffff',
  
  -- Diagnosis settings
  diagnosis_type TEXT DEFAULT 'score' CHECK (diagnosis_type IN ('score', 'tags', 'ai')),
  ai_prompt_template TEXT,
  
  -- CTA settings
  final_cta_text TEXT DEFAULT 'Falar com especialista',
  final_cta_url TEXT,
  final_cta_whatsapp TEXT,
  
  -- Metadata
  views_count INTEGER DEFAULT 0,
  starts_count INTEGER DEFAULT 0,
  completions_count INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multiple_choice', 'scale', 'text', 'number', 'url', 'yes_no')),
  helper_text TEXT,
  image_url TEXT,
  is_required BOOLEAN DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  
  -- Scale settings (when type = scale)
  scale_min INTEGER DEFAULT 1,
  scale_max INTEGER DEFAULT 5,
  scale_min_label TEXT,
  scale_max_label TEXT,
  
  -- Scoring axis (for multi-axis scoring)
  scoring_axis TEXT DEFAULT 'default',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Question options (for choice-based questions)
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  points INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  scoring_values JSONB DEFAULT '{}'::jsonb, -- For multi-axis: {"maturidade": 10, "urgencia": 5}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Diagnoses configurations
CREATE TABLE public.quiz_diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  
  -- Matching rules
  min_score INTEGER,
  max_score INTEGER,
  required_tags JSONB DEFAULT '[]'::jsonb,
  scoring_axis TEXT DEFAULT 'default',
  
  -- Content
  title TEXT NOT NULL,
  description TEXT,
  insights JSONB DEFAULT '[]'::jsonb,
  action_plan TEXT,
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  
  -- Priority for matching
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quiz sessions (each respondent session)
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  
  -- Session data
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Computed results
  total_score INTEGER DEFAULT 0,
  scores_by_axis JSONB DEFAULT '{}'::jsonb,
  collected_tags JSONB DEFAULT '[]'::jsonb,
  
  -- Matched diagnosis
  diagnosis_id UUID REFERENCES public.quiz_diagnoses(id),
  ai_generated_diagnosis TEXT,
  
  -- Tracking
  device_type TEXT,
  user_agent TEXT,
  ip_address TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual responses
CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  
  -- Response data (flexible for different question types)
  selected_option_ids JSONB DEFAULT '[]'::jsonb,
  text_response TEXT,
  number_response NUMERIC,
  scale_response INTEGER,
  
  -- Computed
  points_earned INTEGER DEFAULT 0,
  tags_collected JSONB DEFAULT '[]'::jsonb,
  
  -- Timing
  time_spent_seconds INTEGER,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Captured leads
CREATE TABLE public.quiz_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  
  -- Standard fields
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  company TEXT,
  city TEXT,
  state TEXT,
  
  -- Custom fields
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Consent
  lgpd_consent BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX idx_quizzes_slug ON public.quizzes(slug);
CREATE INDEX idx_quizzes_status ON public.quizzes(status);
CREATE INDEX idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_position ON public.quiz_questions(quiz_id, position);
CREATE INDEX idx_quiz_options_question_id ON public.quiz_options(question_id);
CREATE INDEX idx_quiz_diagnoses_quiz_id ON public.quiz_diagnoses(quiz_id);
CREATE INDEX idx_quiz_sessions_quiz_id ON public.quiz_sessions(quiz_id);
CREATE INDEX idx_quiz_sessions_status ON public.quiz_sessions(status);
CREATE INDEX idx_quiz_responses_session_id ON public.quiz_responses(session_id);
CREATE INDEX idx_quiz_leads_quiz_id ON public.quiz_leads(quiz_id);
CREATE INDEX idx_quiz_leads_email ON public.quiz_leads(email);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

-- Quizzes: authenticated users can manage their own
CREATE POLICY "Users can view all quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Users can create quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Questions: follow quiz ownership
CREATE POLICY "Allow all on quiz_questions" ON public.quiz_questions FOR ALL USING (true) WITH CHECK (true);

-- Options: follow question ownership
CREATE POLICY "Allow all on quiz_options" ON public.quiz_options FOR ALL USING (true) WITH CHECK (true);

-- Diagnoses: follow quiz ownership
CREATE POLICY "Allow all on quiz_diagnoses" ON public.quiz_diagnoses FOR ALL USING (true) WITH CHECK (true);

-- Sessions: public can create (respondents), owners can read
CREATE POLICY "Anyone can create sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view sessions" ON public.quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update sessions" ON public.quiz_sessions FOR UPDATE USING (true);

-- Responses: public can create, owners can read
CREATE POLICY "Anyone can create responses" ON public.quiz_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view responses" ON public.quiz_responses FOR SELECT USING (true);

-- Leads: public can create, owners can read
CREATE POLICY "Anyone can create leads" ON public.quiz_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view leads" ON public.quiz_leads FOR SELECT USING (true);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_diagnoses_updated_at BEFORE UPDATE ON public.quiz_diagnoses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();