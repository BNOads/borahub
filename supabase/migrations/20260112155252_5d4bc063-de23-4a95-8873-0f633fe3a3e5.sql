-- Add category column to funnels table
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS category TEXT;

-- Create links table
CREATE TABLE public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT,
  favicon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create acessos_logins table (passwords)
CREATE TABLE public.acessos_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_acesso TEXT NOT NULL,
  login_usuario TEXT NOT NULL,
  senha_criptografada TEXT NOT NULL,
  categoria TEXT NOT NULL,
  link_acesso TEXT,
  notas_adicionais TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration INTEGER,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_lesson_progress table
CREATE TABLE public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, lesson_id)
);

-- Create indexes
CREATE INDEX idx_links_category ON public.links(category);
CREATE INDEX idx_acessos_categoria ON public.acessos_logins(categoria);
CREATE INDEX idx_courses_category ON public.courses(category);
CREATE INDEX idx_lessons_course ON public.lessons(course_id);
CREATE INDEX idx_user_progress_user ON public.user_lesson_progress(user_id);
CREATE INDEX idx_user_progress_lesson ON public.user_lesson_progress(lesson_id);

-- Enable RLS
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Permissive policies for now
CREATE POLICY "Allow all on links" ON public.links FOR ALL USING (true);
CREATE POLICY "Allow all on acessos_logins" ON public.acessos_logins FOR ALL USING (true);
CREATE POLICY "Allow all on courses" ON public.courses FOR ALL USING (true);
CREATE POLICY "Allow all on lessons" ON public.lessons FOR ALL USING (true);
CREATE POLICY "Allow all on user_lesson_progress" ON public.user_lesson_progress FOR ALL USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_acessos_logins_updated_at BEFORE UPDATE ON public.acessos_logins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();