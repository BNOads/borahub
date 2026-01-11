
-- Perfis Sociais
CREATE TABLE IF NOT EXISTS public.social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Linha Editorial
CREATE TABLE IF NOT EXISTS public.editorial_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL,
    profile_id UUID REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    intention TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts
CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.social_profiles(id) ON DELETE CASCADE,
    scheduled_date DATE,
    day_of_week TEXT,
    post_type TEXT CHECK (post_type IN ('Reels', 'Carrossel', 'Imagem', 'Vídeo', 'Stories')),
    theme TEXT,
    status TEXT NOT NULL DEFAULT 'Planejado' CHECK (status IN ('Planejado', 'Em desenvolvimento de ideia', 'Em produção visual ou vídeo', 'Em revisão', 'Ajustes solicitados', 'Aprovado', 'Agendado', 'Publicado')),
    current_assignee_id UUID REFERENCES auth.users(id),
    start_date DATE,
    deadline DATE,
    editorial_line_id UUID REFERENCES public.editorial_lines(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários (Chat do Post)
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_adjustment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Histórico de Posts
CREATE TABLE IF NOT EXISTS public.post_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated profiles" ON public.social_profiles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated editorial" ON public.editorial_lines FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated posts" ON public.social_posts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated comments" ON public.post_comments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated history" ON public.post_history FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Seed initial profiles
INSERT INTO public.social_profiles (name, icon, color) VALUES
('Bora na Obra', '🏗️', '#D4AF37'),
('Rafa Brasileiro', '👤', '#3498db'),
('Alex Brasileiro', '👤', '#e74c3c'),
('Bora Arq', '📐', '#2ecc71'),
('Bora Construtora', '🏢', '#9b59b6');
