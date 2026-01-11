
-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'Ferramentas', 'Processos'
    level TEXT, -- e.g., 'Iniciante', 'Intermediário'
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    duration TEXT, -- e.g., '10:00'
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_lesson_progress table
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_watched_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Policies for courses
CREATE POLICY "Allow all authenticated users to read courses" ON public.courses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to insert courses" ON public.courses
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update courses" ON public.courses
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to delete courses" ON public.courses
    FOR DELETE TO authenticated USING (true);

-- Policies for lessons
CREATE POLICY "Allow all authenticated users to read lessons" ON public.lessons
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to insert lessons" ON public.lessons
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update lessons" ON public.lessons
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to delete lessons" ON public.lessons
    FOR DELETE TO authenticated USING (true);

-- Policies for user_lesson_progress
CREATE POLICY "Allow users to read their own progress" ON public.user_lesson_progress
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own progress" ON public.user_lesson_progress
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own progress" ON public.user_lesson_progress
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Sample Data (Optional, but helps with initial view)
INSERT INTO public.courses (title, description, category, level) VALUES
('Curso da Plataforma BNOapp', 'Aprenda a utilizar todas as funcionalidades da nossa plataforma.', 'Ferramentas', 'Iniciante'),
('Curso de Tráfego Interno | Método BNOapp', 'Domine as estratégias de tráfego pago da nossa agência.', 'Processos', 'Intermediário'),
('Curso de Clickup Interno | Método BNOads', 'Organize seu fluxo de trabalho com o Clickup.', 'Ferramentas', 'Iniciante'),
('Curso de Automação | Método BNOads', 'Aprenda a automatizar processos repetitivos.', 'Ferramentas', 'Iniciante');
