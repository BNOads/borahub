-- Create social_profiles table
CREATE TABLE public.social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create editorial_lines table
CREATE TABLE public.editorial_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  intention TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create social_posts table
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  day_of_week TEXT,
  post_type TEXT NOT NULL DEFAULT 'Reels',
  theme TEXT,
  status TEXT NOT NULL DEFAULT 'Planejado',
  current_assignee_id TEXT,
  start_date DATE,
  deadline DATE,
  editorial_line_id UUID REFERENCES public.editorial_lines(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create post_comments table
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_adjustment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create post_history table
CREATE TABLE public.post_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_social_posts_profile ON public.social_posts(profile_id);
CREATE INDEX idx_social_posts_date ON public.social_posts(scheduled_date);
CREATE INDEX idx_social_posts_status ON public.social_posts(status);
CREATE INDEX idx_editorial_lines_profile ON public.editorial_lines(profile_id);
CREATE INDEX idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX idx_post_history_post ON public.post_history(post_id);

-- Enable RLS
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_history ENABLE ROW LEVEL SECURITY;

-- Permissive policies for now
CREATE POLICY "Allow all on social_profiles" ON public.social_profiles FOR ALL USING (true);
CREATE POLICY "Allow all on editorial_lines" ON public.editorial_lines FOR ALL USING (true);
CREATE POLICY "Allow all on social_posts" ON public.social_posts FOR ALL USING (true);
CREATE POLICY "Allow all on post_comments" ON public.post_comments FOR ALL USING (true);
CREATE POLICY "Allow all on post_history" ON public.post_history FOR ALL USING (true);

-- Trigger for updated_at on social_profiles
CREATE TRIGGER update_social_profiles_updated_at
  BEFORE UPDATE ON public.social_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on social_posts
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();